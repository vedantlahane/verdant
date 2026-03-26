"use client";

import React from "react";
import {
  DocSection,
  DocSubsection,
  DocParagraph,
  CodeBlock,
  DocTable,
} from "../DocSection";

export function NodeTypesSection() {
  return (
    <>
      <DocSection title="Built-in Node Types">
        <DocParagraph>
          Verdant recognizes 80+ built-in node types organized into categories. Each type maps to a default shape.
        </DocParagraph>
      </DocSection>

      <DocSection title="Compute">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["server", "cube", "General server"],
            ["service", "cube", "Backend service"],
            ["microservice", "cube", "Microservice"],
            ["function", "pentagon", "Serverless function"],
            ["lambda", "pentagon", "AWS Lambda"],
            ["container", "box", "Container instance"],
            ["pod", "box", "Kubernetes pod"],
            ["worker", "cube", "Background worker"],
            ["vm", "box", "Virtual machine"],
            ["task", "cube", "Async task"],
          ]}
        />
      </DocSection>

      <DocSection title="Storage">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["database", "cylinder", "Database"],
            ["cache", "hexagon", "Cache store"],
            ["storage", "cylinder", "Object storage"],
            ["bucket", "cylinder", "Cloud bucket (S3, GCS)"],
            ["datalake", "cylinder", "Data lake"],
            ["warehouse", "cylinder", "Data warehouse"],
            ["filesystem", "cylinder", "File system"],
            ["volume", "cylinder", "Persistent volume"],
          ]}
        />
      </DocSection>

      <DocSection title="Network">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["gateway", "diamond", "API gateway"],
            ["loadbalancer", "diamond", "Load balancer"],
            ["proxy", "diamond", "Reverse proxy"],
            ["firewall", "octagon", "Network firewall"],
            ["cdn", "ring", "Content delivery network"],
            ["dns", "ring", "DNS service"],
            ["router", "ring", "Network router"],
            ["api", "diamond", "API endpoint"],
          ]}
        />
      </DocSection>

      <DocSection title="Messaging">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["queue", "torus", "Message queue"],
            ["topic", "torus", "Pub/sub topic"],
            ["stream", "torus", "Event stream"],
            ["bus", "torus", "Message bus"],
            ["broker", "torus", "Message broker"],
            ["pubsub", "torus", "Pub/sub system"],
          ]}
        />
      </DocSection>

      <DocSection title="Cloud Infrastructure">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["cloud", "sphere", "Cloud provider"],
            ["region", "ring", "Cloud region"],
            ["zone", "ring", "Availability zone"],
            ["vpc", "ring", "Virtual private cloud"],
            ["subnet", "ring", "Network subnet"],
            ["cluster", "ring", "Compute cluster"],
            ["namespace", "ring", "Kubernetes namespace"],
          ]}
        />
      </DocSection>

      <DocSection title="Clients">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["user", "sphere", "Human user"],
            ["client", "sphere", "Client application"],
            ["browser", "sphere", "Web browser"],
            ["mobile", "sphere", "Mobile app"],
            ["iot", "sphere", "IoT device"],
            ["device", "sphere", "Generic device"],
          ]}
        />
      </DocSection>

      <DocSection title="Observability">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["monitor", "hexagon", "Monitoring system"],
            ["logger", "hexagon", "Logging service"],
            ["tracer", "hexagon", "Distributed tracer"],
            ["alerter", "hexagon", "Alert manager"],
            ["dashboard", "hexagon", "Dashboard"],
          ]}
        />
      </DocSection>

      <DocSection title="Security">
        <DocTable
          headers={["Type", "Default Shape", "Description"]}
          rows={[
            ["auth", "octagon", "Authentication service"],
            ["vault", "octagon", "Secret vault"],
            ["waf", "octagon", "Web application firewall"],
            ["certificate", "octagon", "Certificate manager"],
            ["identity", "octagon", "Identity provider"],
          ]}
        />
      </DocSection>
    </>
  );
}
