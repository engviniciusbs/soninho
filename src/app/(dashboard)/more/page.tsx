"use client";

import type { ComponentType } from "react";
import { PageTitle } from "@/components/ui/page-title";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { useBaby } from "@/components/providers/BabyProvider";
import {
  IconBaby,
  IconBell,
  IconChat,
  IconDoc,
  IconGear,
  IconSpark,
  IconUsers,
} from "@/components/brand/icons";
import type { IconProps } from "@/components/brand/icons";

interface MoreItem {
  href: string;
  title: string;
  subtitle: string;
  icon: ComponentType<IconProps>;
}

interface MoreGroup {
  title: string;
  items: MoreItem[];
}

const PROFILE_ITEM: MoreItem = {
  href: "/more/profile",
  title: "Perfil e preferências",
  subtitle: "Seu nome, modo babá, sair",
  icon: IconGear,
};

/** Items of Mais (spec §8.7, mockup "Mais"); subtitles carry the real baby names. */
function buildGroups(activeName: string | null, babyNames: string[]): MoreGroup[] {
  return [
    {
      title: "Assistente",
      items: [
        {
          href: "/more/ai/chat",
          title: "Pergunte à IA",
          subtitle: activeName ? `Converse sobre o sono de ${activeName}` : "Converse sobre o sono do bebê",
          icon: IconChat,
        },
        {
          href: "/more/ai",
          title: "Resumos da IA",
          subtitle: "Hoje, padrões e recomendações",
          icon: IconSpark,
        },
      ],
    },
    {
      title: "Casa",
      items: [
        {
          href: "/more/babies",
          title: "Bebês",
          subtitle: babyNames.length > 0 ? babyNames.join(", ") : "Adicione o primeiro bebê",
          icon: IconBaby,
        },
        {
          href: "/more/family",
          title: "Família",
          subtitle: "Quem acompanha e convites",
          icon: IconUsers,
        },
      ],
    },
    {
      title: "Conta",
      items: [
        {
          href: "/more/notifications",
          title: "Notificações",
          subtitle: "Alertas de soneca e e-mail semanal",
          icon: IconBell,
        },
        {
          href: "/more/reports",
          title: "Relatórios e exportar",
          subtitle: "PDF para o pediatra e CSV",
          icon: IconDoc,
        },
        PROFILE_ITEM,
      ],
    },
  ];
}

/** The nanny only sees her own profile (spec §8.2). */
const NANNY_GROUPS: MoreGroup[] = [{ title: "Conta", items: [PROFILE_ITEM] }];

/** Loading shape: three group headings over cards of 2, 2 and 3 rows. */
function MoreSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" role="status" aria-label="Carregando">
      {[2, 2, 3].map((rows, g) => (
        <div key={g}>
          <Skeleton className="mx-1 mb-2 h-4 w-24" />
          <Card className="gap-0 divide-y divide-sn-bd px-3.5 py-1">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-1 py-3">
                <Skeleton className="size-[38px] shrink-0" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

export default function MorePage() {
  const { isNannyMode, isLoading } = useUserProfile();
  const { activeBaby, babies } = useBaby();
  const groups = isNannyMode
    ? NANNY_GROUPS
    : buildGroups(activeBaby?.name ?? null, babies.map((b) => b.name));

  return (
    <div>
      <PageTitle>Mais</PageTitle>
      {isLoading ? (
        <MoreSkeleton />
      ) : (
        <div className="flex flex-col gap-3.5">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`more-${group.title}`}>
              <h2
                id={`more-${group.title}`}
                className="mx-1 mb-2 font-sans text-[13px] font-bold text-sn-mu"
              >
                {group.title}
              </h2>
              <Card className="gap-0 px-3.5 py-1">
                <ul className="divide-y divide-sn-bd">
                  {group.items.map(({ href, title, subtitle, icon: Icon }) => (
                    <li key={href}>
                      <ListRow href={href} title={title} subtitle={subtitle} icon={<Icon />} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
