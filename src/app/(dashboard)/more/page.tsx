"use client";

import { PageTitle } from "@/components/ui/page-title";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import {
  IconBaby,
  IconBell,
  IconChat,
  IconDoc,
  IconGear,
  IconSpark,
  IconUsers,
} from "@/components/brand/icons";
import type { ComponentType } from "react";
import type { IconProps } from "@/components/brand/icons";

interface MoreItem {
  href: string;
  title: string;
  icon: ComponentType<IconProps>;
}

interface MoreGroup {
  title: string;
  items: MoreItem[];
}

/** Itens do Mais (spec §8.7). A versão completa, com subtítulos, vem na Tarefa 6. */
const GROUPS: MoreGroup[] = [
  {
    title: "Assistente",
    items: [
      { href: "/more/ai/chat", title: "Pergunte à IA", icon: IconChat },
      { href: "/more/ai", title: "Resumos da IA", icon: IconSpark },
    ],
  },
  {
    title: "Casa",
    items: [
      { href: "/more/babies", title: "Bebês", icon: IconBaby },
      { href: "/more/family", title: "Família", icon: IconUsers },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/more/notifications", title: "Notificações", icon: IconBell },
      { href: "/more/reports", title: "Relatórios e exportar", icon: IconDoc },
      { href: "/more/profile", title: "Perfil e preferências", icon: IconGear },
    ],
  },
];

const NANNY_GROUPS: MoreGroup[] = [
  {
    title: "Conta",
    items: GROUPS.flatMap((g) => g.items).filter((i) => i.href === "/more/profile"),
  },
];

export default function MorePage() {
  const { isNannyMode, isLoading } = useUserProfile();
  const groups = isNannyMode ? NANNY_GROUPS : GROUPS;

  return (
    <div>
      <PageTitle>Mais</PageTitle>
      {!isLoading && (
        <div className="flex flex-col gap-3.5">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`more-${group.title}`}>
              <h2
                id={`more-${group.title}`}
                className="mx-1 mb-2 font-sans text-[13px] font-bold text-sn-mu"
              >
                {group.title}
              </h2>
              <Card className="gap-0 divide-y divide-sn-bd px-3.5 py-1">
                {group.items.map(({ href, title, icon: Icon }) => (
                  <div key={href}>
                    <ListRow href={href} title={title} icon={<Icon />} />
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
