import React, { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { VrdAST } from '@repo/parser';
import { useRendererStore } from './store';

import {
  ServerNode,
  DatabaseNode,
  CacheNode,
  GatewayNode,
  ServiceNode,
  UserNode,
  EdgeLine,
  NodeProps
} from '@repo/components';

export interface VerdantRendererProps {
  ast: VrdAST;
  theme?: string;
  width?: string | number;
  height?: string | number;
}

const NodeRenderer = () => {
  const { ast, positions, selectedNodeId, selectNode } = useRendererStore();

  const handlePointerMissed = () => {
    selectNode(null);
  };

  if (!ast) return null;

  return (
    <group onPointerMissed={handlePointerMissed}>
      {ast.nodes.map((node) => {
        const position = positions[node.id] || [0, 0, 0];
        const isSelected = selectedNodeId === node.id;
        
        // Extract common props
        const commonProps: NodeProps = {
          label: node.props.label || node.id,
          position,
          selected: isSelected,
          color: node.props.color,
          size: node.props.size,
          glow: node.props.glow === true || node.props.glow === 'true',
          onClick: (e) => {
            e.stopPropagation();
            selectNode(node.id);
          }
        };

        // Render specific component based on type
        switch (node.type.toLowerCase()) {
          case 'database':
            return <DatabaseNode key={node.id} {...commonProps} />;
          case 'cache':
            return <CacheNode key={node.id} {...commonProps} />;
          case 'gateway':
            return <GatewayNode key={node.id} {...commonProps} />;
          case 'service':
            return <ServiceNode key={node.id} {...commonProps} />;
          case 'user':
          case 'client':
            return <UserNode key={node.id} {...commonProps} />;
          case 'server':
          default:
            return <ServerNode key={node.id} {...commonProps} />;
        }
      })}

      {ast.edges.map((edge, index) => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        
        if (!fromPos || !toPos) return null;

        return (
          <EdgeLine
            key={`edge-${index}`}
            from={fromPos}
            to={toPos}
            label={edge.label}
            animated={true}
            color="#a8b2c1"
          />
        );
      })}
    </group>
  );
};

export function VerdantRenderer({ ast, theme = 'moss', width = '100%', height = '100%' }: VerdantRendererProps) {
  const setAst = useRendererStore((state) => state.setAst);

  useEffect(() => {
    setAst(ast);
  }, [ast, setAst]);

  // Derive ambient color from theme (mock mapping)
  const ambientColor = theme === 'moss' ? '#e2f5e9' : theme === 'dark' ? '#1e293b' : '#ffffff';

  return (
    <div style={{ width, height, background: theme === 'dark' ? '#0f172a' : '#f8fafc' }}>
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 5, 10], fov: 45 }}>
        <ambientLight intensity={0.6} color={ambientColor} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <NodeRenderer />
        
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={2} 
          maxDistance={50} 
        />
      </Canvas>
    </div>
  );
}
