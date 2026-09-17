use serde::Serialize;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

mod graph;

use graph::{build_graph, GraphData};

#[derive(Serialize, Clone)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

fn build_tree(dir: &Path) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            let children = build_tree(&path)?;
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: true,
                children: Some(children),
            });
        } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
fn list_vault(vault_path: &str) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(vault_path);
    if !path.is_dir() {
        return Err("Vault path is not a directory".into());
    }
    build_tree(path)
}

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: &str, content: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    if file_path.exists() {
        return Err("File already exists".into());
    }
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_directory(path: &str) -> Result<String, String> {
    let directory_path = Path::new(path);
    match fs::symlink_metadata(directory_path) {
        Ok(_) => return Err("Destination already exists".into()),
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }

    if let Some(parent) = directory_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::create_dir(directory_path).map_err(|e| e.to_string())?;

    fs::canonicalize(directory_path)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn move_entry(source_path: &str, destination_dir: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    let source_metadata = match fs::symlink_metadata(source) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Err("Source does not exist".into());
        }
        Err(error) => return Err(error.to_string()),
    };
    let destination = Path::new(destination_dir);
    if !destination.is_dir() {
        return Err("Destination is not a directory".into());
    }

    let source_name = source
        .file_name()
        .ok_or_else(|| "Source has no file name".to_string())?;
    let canonical_destination = fs::canonicalize(destination).map_err(|e| e.to_string())?;

    if source_metadata.is_dir() {
        let canonical_source = fs::canonicalize(source).map_err(|e| e.to_string())?;
        if canonical_destination.starts_with(&canonical_source) {
            return Err("Cannot move a directory into itself or a descendant".into());
        }
    }

    let new_path = canonical_destination.join(source_name);
    match fs::symlink_metadata(&new_path) {
        Ok(_) => return Err("Destination already contains an entry with that name".into()),
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }

    fs::rename(source, &new_path).map_err(|e| e.to_string())?;
    // Return the destination-joined (non-canonicalized) path so it matches
    // the form `list_vault` produces for the rest of the app.
    Ok(destination.join(source_name).to_string_lossy().to_string())
}

#[tauri::command]
fn delete_entry(path: &str, vault_path: &str) -> Result<(), String> {
    let vault = Path::new(vault_path);
    let canonical_vault = fs::canonicalize(vault).map_err(|e| e.to_string())?;
    let target = Path::new(path);

    // Already gone — treat as success so retries are idempotent.
    let metadata = match fs::symlink_metadata(target) {
        Ok(m) => m,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.to_string()),
    };
    let canonical_target =
        fs::canonicalize(target).map_err(|e| e.to_string())?;

    // Refuse to delete the vault root itself or anything outside the vault.
    if canonical_target == canonical_vault || !canonical_target.starts_with(&canonical_vault) {
        return Err("Refusing to delete outside the vault".into());
    }

    if metadata.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn get_graph_data(vault_path: &str) -> Result<GraphData, String> {
    build_graph(vault_path)
}

struct WatchState {
    generation: u64,
}

#[tauri::command]
fn watch_vault(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WatchState>>,
    vault_path: &str,
) -> Result<(), String> {
    use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
    use std::sync::mpsc::channel;

    let path = Path::new(vault_path);
    if !path.is_dir() {
        return Err("Vault path is not a directory".into());
    }
    let vault = vault_path.to_string();

    let generation = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.generation += 1;
        s.generation
    };

    let handle = app.clone();
    std::thread::spawn(move || {
        let (tx, rx) = channel();
        let config = Config::default().with_poll_interval(Duration::from_millis(150));
        let mut watcher: RecommendedWatcher = match Watcher::new(tx, config) {
                Ok(w) => w,
                Err(_) => return,
            };
        if watcher
            .watch(Path::new(&vault), RecursiveMode::Recursive)
            .is_err()
        {
            return;
        }
        let mut pending: Option<Instant> = None;
        loop {
            // Stop if a newer watch_vault call superseded us.
            let superseded = handle
                .try_state::<Mutex<WatchState>>()
                .and_then(|s| s.lock().ok().map(|s| s.generation != generation))
                .unwrap_or(false);
            if superseded {
                return;
            }
            match rx.recv_timeout(Duration::from_millis(200)) {
                Ok(_) => {
                    pending = Some(Instant::now());
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                Err(_) => return,
            }
            // Debounce: rebuild 400ms after the last event.
            if let Some(t) = pending {
                if t.elapsed() >= Duration::from_millis(400) {
                    pending = None;
                    if let Ok(data) = build_graph(&vault) {
                        let _ = handle.emit("graph-updated", data);
                    }
                }
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(WatchState { generation: 0 }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_vault,
            read_file,
            write_file,
            create_file,
            create_directory,
            move_entry,
            delete_entry,
            get_graph_data,
            watch_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
