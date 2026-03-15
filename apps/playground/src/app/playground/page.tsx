import { PlaygroundApp } from "@/features/playground/PlaygroundApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Write .vrd code and see your 3D architecture diagram update in real time.",
};

export default function PlaygroundPage() {
  return <PlaygroundApp />;
}