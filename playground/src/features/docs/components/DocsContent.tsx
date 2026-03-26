"use client";

import React from "react";
import { OverviewSection } from "./sections/OverviewSection";
import { BasicSyntaxSection } from "./sections/BasicSyntaxSection";
import { ConfigurationSection } from "./sections/ConfigurationSection";
import { NodesSection } from "./sections/NodesSection";
import { EdgesSection } from "./sections/EdgesSection";
import { GroupsSection } from "./sections/GroupsSection";
import { PortsSection } from "./sections/PortsSection";
import { AnimationsSection } from "./sections/AnimationsSection";
import { NodeTypesSection } from "./sections/NodeTypesSection";
import { ShapesSection } from "./sections/ShapesSection";
import { PropertiesSection } from "./sections/PropertiesSection";
import { ExamplesSection } from "./sections/ExamplesSection";

interface DocsContentProps {
  activeSection: string;
}

export function DocsContent({ activeSection }: DocsContentProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "basic-syntax":
        return <BasicSyntaxSection />;
      case "configuration":
        return <ConfigurationSection />;
      case "nodes":
        return <NodesSection />;
      case "edges":
        return <EdgesSection />;
      case "groups":
        return <GroupsSection />;
      case "ports":
        return <PortsSection />;
      case "animations":
        return <AnimationsSection />;
      case "node-types":
        return <NodeTypesSection />;
      case "shapes":
        return <ShapesSection />;
      case "properties":
        return <PropertiesSection />;
      case "examples":
        return <ExamplesSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="px-6 md:px-10 lg:px-16 py-16 md:py-24 max-w-[900px]">
      {renderSection()}
    </div>
  );
}
