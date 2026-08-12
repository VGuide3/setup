"use client";

import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { type CreateConfigParameters } from "wagmi";

export const wagmiConfig: CreateConfigParameters = {
  chains: [mainnet],
  multiInjectedProviderDiscovery: true,
  ssr: false,
  transports: {
    [mainnet.id]: http("https://eth.llamarpc.com"),
  },
};

export const config = createConfig(wagmiConfig);

export { mainnet };
