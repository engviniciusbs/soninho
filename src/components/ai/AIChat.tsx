"use client";

import { useState, useRef, useEffect } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toChatPayload, CHAT_MAX_CONTENT } from "@/lib/ai/chatSchema";
import { IconSend, IconSpark } from "@/components/brand/icons";
import { g } from "@/lib/i18n/gender";
import type { BabySex } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Suggested questions: a short button label; the full question is what gets
 * sent. The question agrees with `babies.sex`, and is neutral when it is null.
 */
export function quickQuestions(sex: BabySex | null | undefined) {
  return [
    {
      label: "Por que acorda tão cedo?",
      question: g(sex, {
        f: "Por que minha bebê acorda cedo demais?",
        m: "Por que meu bebê acorda cedo demais?",
        n: "Por que o sono termina tão cedo de manhã?",
      }),
    },
    {
      label: "Horário normal para a idade?",
      question: g(sex, {
        f: "Esse horário de sono é normal para a idade dela?",
        m: "Esse horário de sono é normal para a idade dele?",
        n: "Esse horário de sono é normal para esta idade?",
      }),
    },
    { label: "Como prolongar as sonecas?", question: "Como prolongar as sonecas?" },
    { label: "Que horas dormir hoje?", question: "Qual deve ser o horário de dormir hoje à noite?" },
  ];
}

export function AIChat() {
  const { activeBaby } = useBaby();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Keeps the newest message in view by scrolling the list itself, not the
  // page (scrollIntoView would also scroll the page under the header).
  useEffect(() => {
    const list = listRef.current;
    if (list && messages.length > 0) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!activeBaby || !content.trim()) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: activeBaby.id,
          messages: toChatPayload(newMessages),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const err = await res.json().catch(() => null);
          if (err && typeof err.error === "string") {
            setMessages((prev) => [...prev, { role: "assistant", content: err.error }]);
            return;
          }
        }
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                const content = assistantContent;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ""),
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-5 pt-6 text-center">
            <span
              aria-hidden="true"
              className="grid size-16 place-items-center rounded-full bg-sn-s2 text-sn-pr"
            >
              <IconSpark size={30} />
            </span>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-sn-tx">Pergunte sobre o sono</h2>
              <p className="max-w-sm text-base text-sn-mu">
                Tenho acesso aos dados de sono do seu bebê e posso ajudar
                com dúvidas sobre rotina, janelas de vigília e dicas.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {quickQuestions(activeBaby?.sex).map(({ label, question }) => (
                <button
                  key={question}
                  type="button"
                  className="min-h-11 cursor-pointer rounded-2xl border border-sn-bd bg-sn-s1 px-4 py-2.5 text-left font-sans text-[15px] font-bold whitespace-nowrap text-sn-tx outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out hover:border-sn-pr/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr disabled:pointer-events-none disabled:opacity-55"
                  onClick={() => sendMessage(question)}
                  disabled={isStreaming}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-sn-s2 text-sn-pr"
              >
                <IconSpark size={16} />
              </span>
            )}
            <div
              className={`max-w-[82%] rounded-[20px] px-4 py-3 ${
                msg.role === "user"
                  ? "rounded-br-md bg-sn-pr text-sn-pr-ink"
                  : "rounded-bl-md border border-sn-bd bg-sn-s1 text-sn-tx"
              }`}
            >
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isStreaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant" && (
                    <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-current" />
                  )}
              </p>
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-sn-s2 text-sn-pr"
            >
              <IconSpark size={16} />
            </span>
            <div className="rounded-[20px] rounded-bl-md border border-sn-bd bg-sn-s1 px-4 py-3">
              <span className="sr-only">Escrevendo resposta</span>
              <span
                aria-hidden="true"
                className="block size-4 animate-spin rounded-full border-2 border-sn-mu border-r-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-sn-bd pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Faça uma pergunta sobre o sono..."
          aria-label="Sua pergunta"
          className="max-h-[120px] min-h-11 resize-none rounded-[22px] border-sn-mu/70 bg-sn-s1 px-4 py-2.5 text-base"
          rows={1}
          maxLength={CHAT_MAX_CONTENT}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isStreaming || !input.trim()}
          aria-label="Enviar mensagem"
        >
          <IconSend size={20} />
        </Button>
      </form>
    </div>
  );
}
