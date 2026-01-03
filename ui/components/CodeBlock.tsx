import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  children: React.ReactNode;
  className?: string;
  language?: string;
};

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const code = String(children).replace(/\n$/, "");
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <pre className={cn("overflow-x-auto rounded-lg bg-muted/60 p-4 text-sm", className)}>
        <code className={language ? `language-${language}` : undefined}>
          {children}
        </code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="absolute right-2 top-2 size-8 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? (
          <CheckIcon className="size-4 text-green-500" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}
