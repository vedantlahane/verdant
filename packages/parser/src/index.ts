export interface VrdConfig {
  [key: string]: any;
}

export interface VrdNode {
  id: string;
  type: string;
  props: Record<string, any>;
  group?: string;
}

export interface VrdEdge {
  from: string;
  to: string;
  label?: string;
}

export interface VrdGroup {
  id: string;
  label?: string;
}

export interface VrdAST {
  config: VrdConfig;
  nodes: VrdNode[];
  edges: VrdEdge[];
  groups: VrdGroup[];
}

export class VrdParserError extends Error {
  constructor(message: string, public line: number) {
    super(`[Line ${line}] ${message}`);
    this.name = 'VrdParserError';
  }
}

export function parseVrd(input: string): VrdAST {
  const ast: VrdAST = {
    config: {},
    nodes: [],
    edges: [],
    groups: []
  };

  const lines = input.split('\n');

  interface Scope {
    type: 'root' | 'group' | 'node';
    id?: string;
    indent: number;
  }
  
  const stack: Scope[] = [{ type: 'root', indent: -1 }];
  
  // Regexes
  const EDGE_REGEX = /^([\w.-]+)\s*->\s*([\w.-]+)(?:\s*:\s*(.*))?$/;
  const GROUP_START_REGEX = /^group\s+([\w.-]+)(?:\s+"([^"]+)")?\s*:$/;
  const NODE_START_REGEX = /^([\w.-]+)\s+([\w.-]+)\s*:$/;
  const NODE_REGEX = /^([\w.-]+)\s+([\w.-]+)$/;
  const KV_REGEX = /^([\w.-]+)\s*:\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    
    // Skip empty lines, separators, and comments
    if (originalLine.trim() === '' || originalLine.trim() === '---' || originalLine.trim().startsWith('#')) {
      continue;
    }

    const matchIndent = originalLine.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1].length : 0;
    const line = originalLine.trim();

    // Pop the stack if we've dedented
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    
    const scope = stack[stack.length - 1];

    // Helper to parse values
    const parseValue = (rawVal: string): any => {
      let val: any = rawVal;
      if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || 
          (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
          val = rawVal.slice(1, -1);
      } else {
          if (rawVal === 'true') val = true;
          else if (rawVal === 'false') val = false;
          else if (!isNaN(Number(rawVal)) && rawVal !== '') val = Number(rawVal);
      }
      return val;
    };

    // 1. Edge match
    let match = line.match(EDGE_REGEX);
    if (match) {
      const from = match[1];
      const to = match[2];
      const rawLabel = match[3];
      const edge: VrdEdge = { from, to };
      if (rawLabel) {
        edge.label = parseValue(rawLabel.trim());
      }
      ast.edges.push(edge);
      continue;
    }

    // 2. Group Start match
    match = line.match(GROUP_START_REGEX);
    if (match) {
      const groupId = match[1];
      const label = match[2];
      const group: VrdGroup = { id: groupId };
      if (label) group.label = label;
      ast.groups.push(group);
      stack.push({ type: 'group', id: groupId, indent });
      continue;
    }

    // 3. Node Start match
    match = line.match(NODE_START_REGEX);
    if (match) {
      const type = match[1];
      const localId = match[2];
      const groupId = scope.type === 'group' ? scope.id : undefined;
      const fullId = groupId ? `${groupId}.${localId}` : localId;
      
      const node: VrdNode = { id: fullId, type, props: {} };
      if (groupId) node.group = groupId;
      
      ast.nodes.push(node);
      stack.push({ type: 'node', id: fullId, indent });
      continue;
    }

    // 4. Node match (without properties)
    match = line.match(NODE_REGEX);
    if (match) {
      const type = match[1];
      const localId = match[2];
      const groupId = scope.type === 'group' ? scope.id : undefined;
      const fullId = groupId ? `${groupId}.${localId}` : localId;
      
      const node: VrdNode = { id: fullId, type, props: {} };
      if (groupId) node.group = groupId;
      
      ast.nodes.push(node);
      continue;
    }

    // 5. KV match (Config or Properties)
    match = line.match(KV_REGEX);
    if (match) {
      const key = match[1];
      const val = parseValue(match[2].trim());
      
      if (scope.type === 'root') {
        ast.config[key] = val;
      } else if (scope.type === 'node') {
        // Fast backwards lookup for current node
        for (let j = ast.nodes.length - 1; j >= 0; j--) {
          if (ast.nodes[j].id === scope.id) {
            ast.nodes[j].props[key] = val;
            break;
          }
        }
      }
      continue;
    }

    // If no patterns matched, it's a syntax error
    throw new VrdParserError(`Invalid syntax: "${line}"`, i + 1);
  }

  return ast;
}
