import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import "highlight.js/styles/atom-one-dark.css";
import func2url from "../../backend/func2url.json";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);

type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  lang?: string;
  children?: FileNode[];
  content?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type GeneratedFile = {
  path: string;
  content: string;
  language: string;
};

const INITIAL_FILES: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "App.tsx",
        path: "src/App.tsx",
        type: "file",
        lang: "typescript",
        content: `// Здесь появятся сгенерированные файлы
// Опиши проект в чате справа →`,
      },
    ],
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    text: "Привет! Я CodeGenius AI. Опиши что хочешь создать — я напишу React фронтенд + Python бэкенд и покажу все файлы здесь.",
  },
];

const getIcon = (name: string, type: "file" | "folder", open?: boolean) => {
  if (type === "folder") return open ? "FolderOpen" : "Folder";
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return "FileCode";
  if (name.endsWith(".py")) return "FileCode2";
  if (name.endsWith(".css")) return "Paintbrush";
  if (name.endsWith(".json")) return "Braces";
  if (name.endsWith(".txt") || name.endsWith(".md")) return "FileText";
  return "File";
};

const getLangColor = (lang?: string) => {
  if (lang === "typescript") return "text-[#89b4fa]";
  if (lang === "python") return "text-[#f9e2af]";
  if (lang === "css") return "text-[#cba6f7]";
  return "text-[#a6e3a1]";
};

function buildFileTree(files: GeneratedFile[]): FileNode[] {
  const root: FileNode[] = [];

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = root;

    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (isLast) {
        if (!existing) {
          current.push({
            name: part,
            path: file.path,
            type: "file",
            lang: file.language,
            content: file.content,
          });
        }
      } else {
        if (existing && existing.type === "folder") {
          current = existing.children!;
        } else {
          const folder: FileNode = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            type: "folder",
            children: [],
          };
          current.push(folder);
          current = folder.children!;
        }
      }
    });
  });

  return root;
}

const FileTree = ({
  nodes,
  depth = 0,
  onSelect,
  selectedPath,
}: {
  nodes: FileNode[];
  depth?: number;
  onSelect: (node: FileNode) => void;
  selectedPath: string;
}) => {
  const initOpen: Record<string, boolean> = {};
  nodes.forEach((n) => { if (n.type === "folder") initOpen[n.path] = true; });
  const [open, setOpen] = useState<Record<string, boolean>>(initOpen);

  useEffect(() => {
    const newOpen: Record<string, boolean> = {};
    nodes.forEach((n) => { if (n.type === "folder") newOpen[n.path] = true; });
    setOpen(newOpen);
  }, [nodes.length]);

  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <div
            className={`flex items-center gap-1.5 py-[3px] rounded cursor-pointer text-sm select-none
              ${node.type === "file" && selectedPath === node.path
                ? "bg-[#3c3f44] text-white"
                : "text-[#cdd6f4] hover:bg-[#2e3035] hover:text-white"
              }`}
            style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: "8px" }}
            onClick={() => {
              if (node.type === "folder") setOpen((p) => ({ ...p, [node.path]: !p[node.path] }));
              else onSelect(node);
            }}
          >
            <Icon
              name={getIcon(node.name, node.type, open[node.path])}
              size={14}
              className={node.type === "folder" ? "text-[#89b4fa]" : getLangColor(node.lang)}
            />
            <span className="truncate">{node.name}</span>
          </div>
          {node.type === "folder" && open[node.path] && node.children && (
            <FileTree nodes={node.children} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
          )}
        </div>
      ))}
    </>
  );
};

const CodeBlock = ({ code, lang }: { code: string; lang: string }) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.removeAttribute("data-highlighted");
      hljs.highlightElement(ref.current);
    }
  }, [code, lang]);

  return (
    <pre className="h-full m-0 rounded-none text-[13px] leading-relaxed overflow-auto bg-[#1e1e2e]">
      <code ref={ref} className={`language-${lang} bg-transparent !p-4`}>
        {code}
      </code>
    </pre>
  );
};

export default function Editor() {
  const [fileTree, setFileTree] = useState<FileNode[]>(INITIAL_FILES);
  const [selectedFile, setSelectedFile] = useState<FileNode>(INITIAL_FILES[0].children![0]);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Готов к генерации");
  const [instructions, setInstructions] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", text: userMsg }]);
    setLoading(true);
    setStatusText("ИИ генерирует код...");

    const history = messages.map((m) => ({ role: m.role, content: m.text }));

    const response = await fetch(func2url.generate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userMsg, history }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      setMessages((p) => [...p, { role: "assistant", text: `Ошибка: ${data.error ?? "Что-то пошло не так"}` }]);
      setStatusText("Ошибка генерации");
      setLoading(false);
      return;
    }

    const generated: GeneratedFile[] = data.files ?? [];
    const newTree = buildFileTree(generated);
    setFileTree(newTree);

    if (generated.length > 0) {
      const firstFile = generated[0];
      setSelectedFile({
        name: firstFile.path.split("/").pop()!,
        path: firstFile.path,
        type: "file",
        lang: firstFile.language,
        content: firstFile.content,
      });
    }

    if (data.instructions) {
      setInstructions(data.instructions);
    }

    setMessages((p) => [
      ...p,
      {
        role: "assistant",
        text: `${data.description ?? "Готово!"} Создано файлов: ${generated.length}. ${data.instructions ? "Смотри инструкции ниже 👇" : ""}`,
      },
    ]);
    setStatusText(`Сгенерировано ${generated.length} файлов`);
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#1e1e2e] text-white overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Левая панель — файловое дерево */}
      <div className="w-52 flex-shrink-0 bg-[#181825] border-r border-[#313244] flex flex-col">
        <div className="px-3 py-3 border-b border-[#313244]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#5865f2] rounded flex items-center justify-center">
              <Icon name="Cpu" size={12} className="text-white" />
            </div>
            <span className="text-[#cdd6f4] text-xs font-semibold tracking-wide uppercase">CodeGenius</span>
          </div>
        </div>

        <div className="px-2 py-2 flex-1 overflow-y-auto">
          <div className="flex items-center gap-1 px-1 mb-1">
            <span className="text-[#6c7086] text-[10px] uppercase tracking-widest font-semibold">Проводник</span>
          </div>
          <FileTree nodes={fileTree} onSelect={setSelectedFile} selectedPath={selectedFile?.path ?? ""} />
        </div>

        <div className="border-t border-[#313244] px-2 py-2 space-y-0.5">
          {[
            { icon: "Settings", label: "Настройки" },
            { icon: "FolderOpen", label: "Открыть папку" },
          ].map(({ icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#2e3035] text-xs"
            >
              <Icon name={icon} size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Центр — редактор кода */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#313244]">
        {/* Табы */}
        <div className="flex items-center bg-[#181825] border-b border-[#313244] h-9 overflow-x-auto flex-shrink-0">
          {selectedFile && (
            <div className="flex items-center gap-2 px-4 h-full bg-[#1e1e2e] border-r border-[#313244] text-[#cdd6f4] text-xs border-t border-t-[#5865f2]">
              <Icon name={getIcon(selectedFile.name, "file")} size={12} className={getLangColor(selectedFile.lang)} />
              <span className="max-w-[160px] truncate">{selectedFile.path}</span>
            </div>
          )}
        </div>

        {/* Код */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            <div className="w-10 flex-shrink-0 bg-[#1e1e2e] pt-4 select-none overflow-hidden">
              {(selectedFile?.content ?? "").split("\n").map((_, i) => (
                <div key={i} className="text-right pr-3 text-[#45475a] text-[12px] leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-auto">
              {selectedFile?.content && (
                <CodeBlock code={selectedFile.content} lang={selectedFile.lang ?? "typescript"} />
              )}
            </div>
          </div>
        </div>

        {/* Инструкции после генерации */}
        {instructions && (
          <div className="bg-[#1e2030] border-t border-[#313244] px-4 py-2 text-[12px] text-[#a6e3a1] flex items-start gap-2 max-h-20 overflow-y-auto">
            <Icon name="Info" size={13} className="flex-shrink-0 mt-0.5 text-[#89b4fa]" />
            <span>{instructions}</span>
          </div>
        )}

        {/* Статус бар */}
        <div className="h-6 bg-[#5865f2] flex items-center px-4 gap-4 text-white text-[11px] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Icon name="GitBranch" size={11} />
            <span>main</span>
          </div>
          <div className="flex items-center gap-1.5">
            {loading
              ? <Icon name="Loader" size={11} className="animate-spin" />
              : <Icon name="CheckCircle" size={11} />
            }
            <span>{statusText}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span>{selectedFile?.lang?.toUpperCase() ?? "TSX"}</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>

      {/* Правая панель — чат */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-[#181825]">
        <div className="px-4 py-3 border-b border-[#313244] flex items-center gap-2">
          <div className="w-7 h-7 bg-[#5865f2] rounded-full flex items-center justify-center">
            <Icon name="Sparkles" size={13} className="text-white" />
          </div>
          <div>
            <div className="text-[#cdd6f4] text-sm font-semibold">CodeGenius AI</div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-[#f9e2af] animate-pulse" : "bg-[#a6e3a1]"}`}></div>
              <span className={`text-[10px] ${loading ? "text-[#f9e2af]" : "text-[#a6e3a1]"}`}>
                {loading ? "генерирует..." : "онлайн"}
              </span>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="w-7 h-7 p-0 text-[#6c7086] hover:text-white hover:bg-[#313244]"
              onClick={() => {
                setMessages(INITIAL_MESSAGES);
                setFileTree(INITIAL_FILES);
                setInstructions("");
                setStatusText("Готов к генерации");
              }}
            >
              <Icon name="RotateCcw" size={12} />
            </Button>
          </div>
        </div>

        {/* Сообщения */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
                  ${msg.role === "assistant" ? "bg-[#5865f2]" : "bg-[#45475a]"}`}
              >
                {msg.role === "assistant" ? <Icon name="Sparkles" size={11} className="text-white" /> : "Я"}
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap
                  ${msg.role === "assistant"
                    ? "bg-[#2e3035] text-[#cdd6f4] rounded-tl-none"
                    : "bg-[#5865f2] text-white rounded-tr-none"
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[#5865f2] flex-shrink-0 flex items-center justify-center mt-0.5">
                <Icon name="Sparkles" size={11} className="text-white" />
              </div>
              <div className="bg-[#2e3035] rounded-xl rounded-tl-none px-3 py-2">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-[#6c7086] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#6c7086] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#6c7086] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Быстрые промпты */}
        <div className="px-3 py-2 border-t border-[#313244] flex gap-1.5 flex-wrap">
          {["CRM система", "Лендинг", "ToDo приложение", "API бэкенд"].map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="text-[11px] px-2 py-1 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Ввод */}
        <div className="p-3 border-t border-[#313244]">
          <div className="flex gap-2 bg-[#2e3035] rounded-xl px-3 py-2 border border-[#313244] focus-within:border-[#5865f2] transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Опиши проект..."
              rows={2}
              className="flex-1 bg-transparent text-[#cdd6f4] text-[13px] resize-none outline-none placeholder:text-[#45475a]"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="self-end w-7 h-7 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
            >
              <Icon name="Send" size={12} className="text-white" />
            </button>
          </div>
          <div className="text-[10px] text-[#45475a] mt-1.5 text-center">Enter — отправить · Shift+Enter — перенос</div>
        </div>
      </div>
    </div>
  );
}
