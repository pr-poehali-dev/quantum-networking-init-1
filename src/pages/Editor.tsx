import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);

type FileNode = {
  name: string;
  type: "file" | "folder";
  lang?: string;
  children?: FileNode[];
  content?: string;
};

const FILES: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "App.tsx",
        type: "file",
        lang: "typescript",
        content: `import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Editor from "./pages/Editor";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/editor" element={<Editor />} />
    </Routes>
  </BrowserRouter>
);

export default App;`,
      },
      {
        name: "pages",
        type: "folder",
        children: [
          {
            name: "Index.tsx",
            type: "file",
            lang: "typescript",
            content: `import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = async () => {
    // Отправляем промпт в CodeGenius AI
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div className="min-h-screen bg-[#36393f]">
      <h1 className="text-white text-2xl font-bold p-8">
        CodeGenius AI
      </h1>
      <div className="px-8">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опиши свой проект..."
          className="w-full h-32 bg-[#40444b] text-white rounded-lg p-4"
        />
        <Button onClick={handleGenerate} className="mt-4 bg-[#5865f2]">
          <Sparkles className="w-4 h-4 mr-2" />
          Сгенерировать
        </Button>
      </div>
    </div>
  );
};

export default Index;`,
          },
        ],
      },
    ],
  },
  {
    name: "backend",
    type: "folder",
    children: [
      {
        name: "generate",
        type: "folder",
        children: [
          {
            name: "index.py",
            type: "file",
            lang: "python",
            content: `import os
import json


def handler(event: dict, context) -> dict:
    """Генерирует структуру проекта через ИИ по промпту пользователя."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    body = json.loads(event.get("body", "{}"))
    prompt = body.get("prompt", "")

    if not prompt:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "Промпт не указан"}),
        }

    # Здесь подключается ИИ для генерации кода
    api_key = os.environ.get("OPENAI_API_KEY")

    result = {
        "status": "success",
        "files_created": ["src/App.tsx", "backend/api/index.py"],
        "message": f"Проект создан по промпту: {prompt[:50]}...",
    }

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps(result),
    }`,
          },
        ],
      },
    ],
  },
];

const MESSAGES = [
  {
    role: "assistant",
    text: "Привет! Я CodeGenius AI. Опиши что хочешь создать — я напишу React фронтенд + Python бэкенд и сразу добавлю файлы в проект.",
  },
];

const getIcon = (name: string, type: "file" | "folder", open?: boolean) => {
  if (type === "folder") return open ? "FolderOpen" : "Folder";
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return "FileCode";
  if (name.endsWith(".py")) return "FileCode2";
  if (name.endsWith(".css")) return "Paintbrush";
  if (name.endsWith(".json")) return "Braces";
  return "File";
};

const FileTree = ({
  nodes,
  depth = 0,
  onSelect,
  selected,
}: {
  nodes: FileNode[];
  depth?: number;
  onSelect: (node: FileNode) => void;
  selected: string;
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ src: true, backend: true, pages: true, generate: true });

  return (
    <>
      {nodes.map((node) => (
        <div key={node.name}>
          <div
            className={`flex items-center gap-1.5 px-2 py-[3px] rounded cursor-pointer text-sm select-none
              ${node.type === "file" && selected === node.name
                ? "bg-[#3c3f44] text-white"
                : "text-[#cdd6f4] hover:bg-[#2e3035] hover:text-white"
              }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") setOpen((p) => ({ ...p, [node.name]: !p[node.name] }));
              else onSelect(node);
            }}
          >
            <Icon
              name={getIcon(node.name, node.type, open[node.name])}
              size={14}
              className={node.type === "folder" ? "text-[#89b4fa]" : "text-[#a6e3a1]"}
            />
            <span>{node.name}</span>
          </div>
          {node.type === "folder" && open[node.name] && node.children && (
            <FileTree nodes={node.children} depth={depth + 1} onSelect={onSelect} selected={selected} />
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
  const [selectedFile, setSelectedFile] = useState<FileNode>(
    FILES[0].children![0] as FileNode
  );
  const [messages, setMessages] = useState(MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", text: userMsg }]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1200));

    setMessages((p) => [
      ...p,
      {
        role: "assistant",
        text: `Понял! Генерирую проект по запросу «${userMsg}». Создаю файлы структуры React + Python...`,
      },
    ]);
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

        <div className="px-2 py-2 border-b border-[#313244]">
          <div className="flex items-center gap-1 px-1 mb-1">
            <span className="text-[#6c7086] text-[10px] uppercase tracking-widest font-semibold">Проводник</span>
          </div>
          <FileTree nodes={FILES} onSelect={setSelectedFile} selected={selectedFile?.name ?? ""} />
        </div>

        <div className="mt-auto border-t border-[#313244] px-2 py-2 space-y-0.5">
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
        {/* Табы файлов */}
        <div className="flex items-center bg-[#181825] border-b border-[#313244] h-9 overflow-x-auto">
          {selectedFile && (
            <div className="flex items-center gap-2 px-4 h-full bg-[#1e1e2e] border-r border-[#313244] text-[#cdd6f4] text-xs border-t border-t-[#5865f2]">
              <Icon name="FileCode" size={12} className="text-[#a6e3a1]" />
              <span>{selectedFile.name}</span>
              <button className="text-[#6c7086] hover:text-[#cdd6f4] ml-1">
                <Icon name="X" size={10} />
              </button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 px-3">
            <button
              className={`text-xs px-3 py-1 rounded ${activeTab === "code" ? "bg-[#313244] text-white" : "text-[#6c7086] hover:text-white"}`}
              onClick={() => setActiveTab("code")}
            >
              Код
            </button>
            <button
              className={`text-xs px-3 py-1 rounded ${activeTab === "preview" ? "bg-[#313244] text-white" : "text-[#6c7086] hover:text-white"}`}
              onClick={() => setActiveTab("preview")}
            >
              Превью
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "code" ? (
            <div className="h-full flex">
              {/* Номера строк */}
              <div className="w-10 flex-shrink-0 bg-[#1e1e2e] pt-4 select-none">
                {(selectedFile?.content ?? "").split("\n").map((_, i) => (
                  <div key={i} className="text-right pr-3 text-[#45475a] text-[12px] leading-relaxed">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Код с подсветкой */}
              <div className="flex-1 overflow-auto">
                {selectedFile?.content && (
                  <CodeBlock code={selectedFile.content} lang={selectedFile.lang ?? "typescript"} />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1e1e2e]">
              <div className="text-center text-[#6c7086]">
                <Icon name="Monitor" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Превью появится после генерации проекта</p>
              </div>
            </div>
          )}
        </div>

        {/* Статус бар */}
        <div className="h-6 bg-[#5865f2] flex items-center px-4 gap-4 text-white text-[11px]">
          <div className="flex items-center gap-1.5">
            <Icon name="GitBranch" size={11} />
            <span>main</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="CheckCircle" size={11} />
            <span>Готов к генерации</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span>{selectedFile?.lang?.toUpperCase() ?? "TSX"}</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>

      {/* Правая панель — чат с ИИ */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-[#181825]">
        {/* Заголовок чата */}
        <div className="px-4 py-3 border-b border-[#313244] flex items-center gap-2">
          <div className="w-7 h-7 bg-[#5865f2] rounded-full flex items-center justify-center">
            <Icon name="Sparkles" size={13} className="text-white" />
          </div>
          <div>
            <div className="text-[#cdd6f4] text-sm font-semibold">CodeGenius AI</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-[#a6e3a1] rounded-full"></div>
              <span className="text-[#a6e3a1] text-[10px]">онлайн</span>
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-[#6c7086] hover:text-white hover:bg-[#313244]">
              <Icon name="RotateCcw" size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-[#6c7086] hover:text-white hover:bg-[#313244]">
              <Icon name="Settings" size={12} />
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
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed
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
          {["CRM система", "Лендинг", "API бэкенд"].map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="text-[11px] px-2 py-1 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Поле ввода */}
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
