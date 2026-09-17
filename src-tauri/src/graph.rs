use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub title: String,
    pub link_count: u32,
    pub is_resolved: bool,
    pub tags: Vec<String>,
}

#[derive(Serialize, Clone)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

#[derive(Serialize, Clone)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

fn strip_md(name: &str) -> String {
    if name.to_lowercase().ends_with(".md") {
        name[..name.len() - 3].to_string()
    } else {
        name.to_string()
    }
}

fn file_title(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

/// Extract `[[target]]` / `[[target|alias]]` raw targets.
fn extract_wiki_targets(content: &str) -> Vec<String> {
    let mut out = Vec::new();
    let bytes = content.as_bytes();
    let mut i = 0;
    while i + 1 < bytes.len() {
        if bytes[i] == b'[' && bytes[i + 1] == b'[' {
            if let Some(end) = content[i + 2..].find("]]") {
                let inner = &content[i + 2..i + 2 + end];
                let target = inner.split('|').next().unwrap_or("").trim();
                if !target.is_empty() {
                    out.push(target.to_string());
                }
                i += end + 4;
                continue;
            }
            break;
        }
        i += 1;
    }
    out
}

/// Extract relative markdown link targets ending in `.md` (no URL scheme).
fn extract_markdown_targets(content: &str) -> Vec<String> {
    let mut out = Vec::new();
    let bytes = content.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'(' {
            if let Some(end) = content[i + 1..].find(')') {
                let mut inner = content[i + 1..i + 1 + end].trim().to_string();
                // strip optional "title" after the URL
                if let Some(sp) = inner.find(char::is_whitespace) {
                    inner = inner[..sp].to_string();
                }
                inner = inner.trim_matches(|c| c == '"' || c == '\'').to_string();
                let base = inner.split(['?', '#']).next().unwrap_or("").to_string();
                let lower = base.to_lowercase();
                let has_scheme = base.contains("://")
                    || base
                        .split_once(':')
                        .map(|(s, _)| !s.contains('/') && !s.is_empty())
                        .unwrap_or(false);
                if !has_scheme && lower.ends_with(".md") && !base.is_empty() {
                    // percent-decode best-effort
                    out.push(percent_decode(&base));
                }
                i += end + 2;
                continue;
            }
            break;
        }
        i += 1;
    }
    out
}

fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h: String = chars.by_ref().take(2).collect();
            if h.len() == 2 {
                if let Ok(b) = u8::from_str_radix(&h, 16) {
                    out.push(b as char);
                    continue;
                }
                out.push('%');
                out.push_str(&h);
            } else {
                out.push('%');
                out.push_str(&h);
            }
        } else {
            out.push(c);
        }
    }
    out
}

fn extract_frontmatter_block(content: &str) -> Option<(&str, &str)> {
    if !content.starts_with("---") {
        return None;
    }
    let end = content[3..].find("\n---")?;
    let block = &content[3..3 + end];
    let rest_start = content[3 + end + 4..].find('\n').map(|p| 3 + end + 4 + p + 1)?;
    Some((block, &content[rest_start..]))
}

fn parse_tags(content: &str) -> Vec<String> {
    let mut tags = HashSet::new();
    let (block, body) = match extract_frontmatter_block(content) {
        Some((b, rest)) => (Some(b), rest),
        None => (None, content),
    };
    if let Some(b) = block {
        // inline `tags: [a, b]` or list form
        for (idx, line) in b.lines().enumerate() {
            let t = line.trim();
            if let Some(rest) = t.strip_prefix("tags:").map(|s| s.trim()) {
                if rest.starts_with('[') && rest.ends_with(']') {
                    for part in rest[1..rest.len() - 1].split(',') {
                        let tag = part.trim().trim_matches(|c| c == '"' || c == '\'');
                        if !tag.is_empty() {
                            tags.insert(tag.to_lowercase());
                        }
                    }
                } else if rest.is_empty() {
                    for l in b.lines().skip(idx + 1) {
                        let l = l.trim();
                        if let Some(item) = l.strip_prefix("-").map(|s| s.trim()) {
                            if item.is_empty() {
                                break;
                            }
                            tags.insert(
                                item.trim_matches(|c| c == '"' || c == '\'').to_lowercase(),
                            );
                        } else {
                            break;
                        }
                    }
                }
                let _ = idx;
            }
        }
    }
    // inline #tags, ignoring fenced code
    let mut stripped = String::with_capacity(body.len());
    let mut in_fence = false;
    for line in body.lines() {
        if line.trim_start().starts_with("```") {
            in_fence = !in_fence;
            stripped.push(' ');
            continue;
        }
        if in_fence {
            stripped.push(' ');
            continue;
        }
        // strip inline code spans
        let mut no_code = String::with_capacity(line.len());
        let mut in_code = false;
        for c in line.chars() {
            if c == '`' {
                in_code = !in_code;
                continue;
            }
            if !in_code {
                no_code.push(c);
            }
        }
        stripped.push_str(&no_code);
        stripped.push(' ');
    }
    let chars: Vec<char> = stripped.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '#'
            && (i == 0 || chars[i - 1].is_whitespace())
            && i + 1 < chars.len()
            && chars[i + 1].is_ascii_alphabetic()
        {
            let mut j = i + 1;
            while j < chars.len()
                && (chars[j].is_alphanumeric() || chars[j] == '_' || chars[j] == '-' || chars[j] == '/')
            {
                j += 1;
            }
            tags.insert(chars[i + 1..j].iter().collect::<String>().to_lowercase());
            i = j;
        } else {
            i += 1;
        }
    }
    let mut v: Vec<String> = tags.into_iter().collect();
    v.sort();
    v
}

fn normalize_path(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

pub fn build_graph(vault_path: &str) -> Result<GraphData, String> {
    let root = Path::new(vault_path);
    if !root.is_dir() {
        return Err("Vault path is not a directory".into());
    }
    // Collect .md files (skip dotfiles).
    let mut files: Vec<PathBuf> = Vec::new();
    for entry in walkdir::WalkDir::new(root)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path().to_path_buf();
        if path
            .file_name()
            .map(|n| n.to_string_lossy().starts_with('.'))
            .unwrap_or(false)
        {
            continue;
        }
        if path.is_file()
            && path
                .extension()
                .and_then(|s| s.to_str())
                .map(|e| e.eq_ignore_ascii_case("md"))
                .unwrap_or(false)
        {
            files.push(path);
        }
    }
    files.sort();

    // basename (lowercased, no .md) -> full id for wiki resolution
    let mut by_basename: HashMap<String, Vec<String>> = HashMap::new();
    let mut contents: HashMap<String, String> = HashMap::new();
    let mut tags_map: HashMap<String, Vec<String>> = HashMap::new();
    for f in &files {
        let id = normalize_path(f);
        let text = fs::read_to_string(f).unwrap_or_default();
        tags_map.insert(id.clone(), parse_tags(&text));
        contents.insert(id.clone(), text);
        let base = f
            .file_stem()
            .map(|s| s.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        by_basename.entry(base).or_default().push(id);
    }

    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen: HashSet<(String, String)> = HashSet::new();
    // unresolved normalized name -> display title
    let mut unresolved: HashMap<String, String> = HashMap::new();

    for f in &files {
        let source = normalize_path(f);
        let content = contents.get(&source).cloned().unwrap_or_default();
        let parent = f.parent().unwrap_or(root);

        for target in extract_wiki_targets(&content) {
            let norm = strip_md(target.trim()).to_lowercase();
            if norm.is_empty() {
                continue;
            }
            match by_basename.get(&norm) {
                Some(ids) => {
                    for id in ids {
                        if *id == source {
                            continue;
                        }
                        if seen.insert((source.clone(), id.clone())) {
                            edges.push(GraphEdge {
                                source: source.clone(),
                                target: id.clone(),
                            });
                        }
                    }
                }
                None => {
                    let key = format!("unresolved:{norm}");
                    unresolved
                        .entry(key.clone())
                        .or_insert_with(|| strip_md(target.trim()));
                    if seen.insert((source.clone(), key.clone())) {
                        edges.push(GraphEdge {
                            source: source.clone(),
                            target: key,
                        });
                    }
                }
            }
        }

        for target in extract_markdown_targets(&content) {
            // resolve relative to parent dir, fallback to basename match
            let candidate = parent.join(&target);
            let cand_id = normalize_path(&candidate);
            if let Some(_) = contents.get(&cand_id) {
                if cand_id != source && seen.insert((source.clone(), cand_id.clone())) {
                    edges.push(GraphEdge {
                        source: source.clone(),
                        target: cand_id,
                    });
                }
                continue;
            }
            let base = Path::new(&target)
                .file_stem()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if let Some(ids) = by_basename.get(&base) {
                for id in ids {
                    if *id == source {
                        continue;
                    }
                    if seen.insert((source.clone(), id.clone())) {
                        edges.push(GraphEdge {
                            source: source.clone(),
                            target: id.clone(),
                        });
                    }
                }
            }
        }
    }

    // in-degree per node
    let mut indegree: HashMap<String, u32> = HashMap::new();
    for e in &edges {
        *indegree.entry(e.target.clone()).or_insert(0) += 1;
    }

    let mut nodes: Vec<GraphNode> = Vec::new();
    for f in &files {
        let id = normalize_path(f);
        nodes.push(GraphNode {
            title: file_title(f),
            link_count: *indegree.get(&id).unwrap_or(&0),
            tags: tags_map.get(&id).cloned().unwrap_or_default(),
            id,
            is_resolved: true,
        });
    }
    let mut unresolved_keys: Vec<String> = unresolved.keys().cloned().collect();
    unresolved_keys.sort();
    for key in unresolved_keys {
        nodes.push(GraphNode {
            title: unresolved.get(&key).cloned().unwrap_or_default(),
            link_count: *indegree.get(&key).unwrap_or(&0),
            tags: Vec::new(),
            id: key,
            is_resolved: false,
        });
    }
    nodes.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(GraphData { nodes, edges })
}
