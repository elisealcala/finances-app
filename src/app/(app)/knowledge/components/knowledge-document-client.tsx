"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  useKnowledgeDocument,
  useKnowledgeNavigation,
} from "@/hooks/use-knowledge";
import { KnowledgeDocument } from "./knowledge-document";
import { KnowledgeWorkspace } from "./knowledge-workspace";

export function KnowledgeDocumentClient({ id }: { id: string }) {
  const { data: document, isLoading } = useKnowledgeDocument(id);
  const navigation = useKnowledgeNavigation();

  return (
    <KnowledgeWorkspace activeView="document" activePillar={document?.pillar}>
      {isLoading || navigation.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading note…</p>
      ) : document ? (
        <KnowledgeDocument
          document={document}
          links={navigation.data?.documents ?? []}
        />
      ) : (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="font-medium">Knowledge note not found</p>
            <p className="text-muted-foreground mt-1 text-sm">
              The note may have moved or needs to be synced from Obsidian.
            </p>
          </CardContent>
        </Card>
      )}
    </KnowledgeWorkspace>
  );
}
