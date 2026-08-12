import {
  Coins,
  Image,
  Vault,
  Route,
  Landmark,
  Radio,
  Box,
} from "lucide-react";
import type { ContractCategory } from "@/types";

export const CATEGORY_META: Record<
  ContractCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  token: { label: "Token", icon: Coins, color: "text-chart-2" },
  nft: { label: "NFT", icon: Image, color: "text-chart-5" },
  vault: { label: "Vault", icon: Vault, color: "text-chart-1" },
  router: { label: "Router", icon: Route, color: "text-chart-4" },
  governance: { label: "Governance", icon: Landmark, color: "text-chart-3" },
  oracle: { label: "Oracle", icon: Radio, color: "text-chart-2" },
  custom: { label: "Contract", icon: Box, color: "text-muted-foreground" },
};

export function CategoryIcon({
  category,
  className,
}: {
  category: ContractCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return <Icon className={className} />;
}
