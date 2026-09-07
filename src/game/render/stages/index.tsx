// Router de escenarios (FASE 5): id -> componente 3D.

import { NeonStage } from "./NeonStage";
import { IronStage } from "./IronStage";
import { DocksStage } from "./DocksStage";

export function StageView({ stageId }: { stageId: string }) {
  if (stageId === "iron") return <IronStage />;
  if (stageId === "docks") return <DocksStage />;
  return <NeonStage />;
}
