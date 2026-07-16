"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  value?: unknown;
  onChange?: (json: unknown) => void;
  placeholder?: string;
};

export function NoteEditor({
  value,
  onChange,
  placeholder = "Write something...",
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "underline underline-offset-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? null,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose-sm dark:prose-invert max-w-none focus:outline-none",
          "min-h-[300px] px-4 py-3",
        ),
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  if (!editor) {
    return (
      <div className="border-input rounded-md border">
        <div className="border-input border-b p-2" />
        <div className="min-h-[300px] px-4 py-3" />
      </div>
    );
  }

  return (
    <div className="border-input bg-card rounded-md border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const buttons: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive: () => boolean;
    action: () => void;
  }[] = [
    {
      icon: Bold,
      label: "Bold",
      isActive: () => editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "Italic",
      isActive: () => editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      isActive: () => editor.isActive("strike"),
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      isActive: () => editor.isActive("heading", { level: 1 }),
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      isActive: () => editor.isActive("heading", { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: List,
      label: "Bullet list",
      isActive: () => editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: "Numbered list",
      isActive: () => editor.isActive("orderedList"),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: "Quote",
      isActive: () => editor.isActive("blockquote"),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: Code,
      label: "Code",
      isActive: () => editor.isActive("code"),
      action: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <div className="border-input flex flex-wrap items-center gap-0.5 border-b p-1">
      {buttons.map(({ icon: Icon, label, isActive, action }) => (
        <button
          key={label}
          type="button"
          title={label}
          onClick={action}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded transition-colors",
            isActive() && "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        title="Link"
        onClick={() => {
          const previous = editor.getAttributes("link").href as
            | string
            | undefined;
          const url = window.prompt("URL", previous ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
        className={cn(
          "hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded transition-colors",
          editor.isActive("link") && "bg-accent text-accent-foreground",
        )}
      >
        <LinkIcon className="size-3.5" />
      </button>
    </div>
  );
}
