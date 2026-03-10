"use client"

import { Loader2 } from "lucide-react"
import { useProject } from "@/lib/hooks"
import { ProjectConfigPupitre } from "@/components/project-config-pupitre"
import { EtincelleConfig } from "@/components/etincelle-config"

interface ProjectConfigProps {
  projectId: string
  onBack: () => void
  onGenerated: () => void
}

export function ProjectConfig({ projectId, onBack, onGenerated }: ProjectConfigProps) {
  const { data: project } = useProject(projectId)

  if (!project) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (project.spectacle === "etincelle") {
    return (
      <EtincelleConfig
        projectId={projectId}
        onBack={onBack}
        onGenerated={onGenerated}
      />
    )
  }

  return (
    <ProjectConfigPupitre
      projectId={projectId}
      onBack={onBack}
      onGenerated={onGenerated}
    />
  )
}
