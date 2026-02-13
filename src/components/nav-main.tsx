"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, ChevronRight } from "lucide-react";
import { Collapsible as Collapsible } from "radix-ui";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

export function NavMain({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items ? (
            <CollapsibleNavItem
              key={item.title}
              item={item}
              pathname={pathname}
            />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url}
                disabled={item.disabled}
                tooltip={item.title}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function CollapsibleNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive = pathname.startsWith(item.url);

  return (
    <Collapsible.Root asChild defaultOpen={isActive} className="group/collapsible">
      <SidebarMenuItem>
        <Collapsible.Trigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub>
            {item.items!.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === subItem.url}
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}
