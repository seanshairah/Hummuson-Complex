"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * TipTap rich editor bound to a hidden form field, so plain server actions
 * receive clean HTML (sanitized again server-side).
 */
export function RichEditor({
  name,
  initialHtml = "",
  placeholder = "Write…",
  minHeight = "12rem",
}: {
  name: string;
  initialHtml?: string;
  placeholder?: string;
  minHeight?: string;
}) {
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "rich-text focus:outline-none max-w-none px-4 py-3",
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: instance }) => setHtml(instance.isEmpty ? "" : instance.getHTML()),
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    if (!editor) return;
    const url = window.prompt("Image URL (e.g. /images/field/…)");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const button = (
    active: boolean | undefined,
    onClick: () => void,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors",
        active ? "bg-humus-900 text-paper" : "text-ink-soft hover:bg-ink/5",
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-xl border border-line bg-cream focus-within:border-leaf-600 focus-within:ring-2 focus-within:ring-leaf-500/25">
      <input type="hidden" name={name} value={html} />
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
        {button(
          editor?.isActive("bold"),
          () => editor?.chain().focus().toggleBold().run(),
          "Bold",
          <Bold className="size-4" />,
        )}
        {button(
          editor?.isActive("italic"),
          () => editor?.chain().focus().toggleItalic().run(),
          "Italic",
          <Italic className="size-4" />,
        )}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {button(
          editor?.isActive("heading", { level: 2 }),
          () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          "Heading 2",
          <Heading2 className="size-4" />,
        )}
        {button(
          editor?.isActive("heading", { level: 3 }),
          () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
          "Heading 3",
          <Heading3 className="size-4" />,
        )}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {button(
          editor?.isActive("bulletList"),
          () => editor?.chain().focus().toggleBulletList().run(),
          "Bullet list",
          <List className="size-4" />,
        )}
        {button(
          editor?.isActive("orderedList"),
          () => editor?.chain().focus().toggleOrderedList().run(),
          "Numbered list",
          <ListOrdered className="size-4" />,
        )}
        {button(
          editor?.isActive("blockquote"),
          () => editor?.chain().focus().toggleBlockquote().run(),
          "Quote",
          <Quote className="size-4" />,
        )}
        {button(
          false,
          () => editor?.chain().focus().setHorizontalRule().run(),
          "Divider",
          <Minus className="size-4" />,
        )}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {button(editor?.isActive("link"), setLink, "Link", <LinkIcon className="size-4" />)}
        {button(false, addImage, "Image", <ImageIcon className="size-4" />)}
        <span className="ml-auto flex gap-0.5">
          {button(
            false,
            () => editor?.chain().focus().undo().run(),
            "Undo",
            <Undo2 className="size-4" />,
          )}
          {button(
            false,
            () => editor?.chain().focus().redo().run(),
            "Redo",
            <Redo2 className="size-4" />,
          )}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
