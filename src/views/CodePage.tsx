"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Copy, Download, Terminal, Paperclip, X } from "lucide-react";
import { useGeminiStream } from "@/hooks/useGeminiStream";
import { systemPrompts } from "@/config/prompts";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "php", label: "PHP" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
];

const taskTypes = [
  { value: "generate", label: "Generate Code" },
  { value: "debug", label: "Debug Code" },
  { value: "explain", label: "Explain Code" },
  { value: "optimize", label: "Optimize Code" },
  { value: "convert", label: "Convert Language" },
];

export default function CodePage() {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [taskType, setTaskType] = useState("");
  const [existingCode, setExistingCode] = useState("");
  const [output, setOutput] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { generateStream, isStreaming, streamedText } = useGeminiStream();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!description.trim() || !language || !taskType) {
      toast({
        title: "Missing Information",
        description: "Please provide a description, select a language and task type.",
        variant: "destructive"
      });
      return;
    }

    try {
      let prompt = "";
      switch (taskType) {
        case "generate":
          prompt = `Generate ${language} code for: ${description}`;
          break;
        case "debug":
          prompt = `Debug this ${language} code and fix any issues: ${existingCode}\nProblem description: ${description}`;
          break;
        case "explain":
          prompt = `Explain this ${language} code in detail: ${existingCode}\nFocus on: ${description}`;
          break;
        case "optimize":
          prompt = `Optimize this ${language} code for better performance: ${existingCode}\nOptimization goals: ${description}`;
          break;
        case "convert":
          prompt = `Convert this code to ${language}: ${existingCode}\nAdditional requirements: ${description}`;
          break;
      }

      const response = await generateStream(systemPrompts.code, prompt, image || undefined, undefined, 'code');

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive"
        });
      } else {
        setOutput(response.text);
        toast({
          title: "Code Generated!",
          description: "Your code has been successfully generated.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard.",
    });
  };

  const downloadCode = () => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      php: 'php',
      go: 'go',
      rust: 'rs',
      sql: 'sql',
      html: 'html',
    };

    const element = document.createElement("a");
    const file = new Blob([output], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `generated-code.${extensions[language] || 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Code className="w-6 h-6 text-ai-primary" />
          <h1 className="text-2xl font-bold">AI Code Generator</h1>
        </div>
        <p className="text-muted-foreground">
          Generate, debug, and explain code in various programming languages with best practices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100%-120px)]">
        {/* Input Section */}
        <Card className="ai-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Code Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-type">Task Type *</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Programming Language *</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">
                  {taskType === "generate" ? "Description *" : "Problem/Requirements *"}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    className="h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md gap-1"
                    disabled={isStreaming}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Add Screenshot/Ref Image
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    taskType === "generate"
                      ? "e.g., Create a function that validates email addresses"
                      : "e.g., The function throws an error when handling null values"
                  }
                  className="min-h-[100px]"
                />
                {image && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 p-1 bg-background/90 border rounded-lg shadow-sm backdrop-blur-sm group">
                    <img
                      src={image}
                      alt="Reference Mockup"
                      className="w-12 h-12 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-sm"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(taskType === "debug" || taskType === "explain" || taskType === "optimize" || taskType === "convert") && (
              <div className="space-y-2">
                <Label htmlFor="existing-code">Existing Code</Label>
                <Textarea
                  id="existing-code"
                  value={existingCode}
                  onChange={(e) => setExistingCode(e.target.value)}
                  placeholder="Paste your existing code here..."
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isStreaming}
              className="w-full"
            >
              {isStreaming ? "Processing..." : "Generate Code"}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="ai-card flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Code
              {output && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCode}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Tabs defaultValue="preview" className="flex-1 flex flex-col">
              <div className="flex justify-end mb-2">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-[400px] border rounded-md p-4 bg-background overflow-auto">
                {(isStreaming ? streamedText : output) ? (
                  <>
                    <TabsContent value="preview" className="mt-0 h-full">
                      <MarkdownRenderer content={isStreaming ? streamedText : output} />
                    </TabsContent>
                    <TabsContent value="edit" className="mt-0 h-full">
                      <Textarea
                        value={isStreaming ? streamedText : output}
                        onChange={(e) => setOutput(e.target.value)}
                        className="h-full resize-none border-0 focus-visible:ring-0 p-0 font-mono text-sm"
                        placeholder="Your generated code will appear here..."
                        readOnly={isStreaming}
                      />
                    </TabsContent>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Generated code will appear here</p>
                      <p className="text-sm mt-2">Select a task type and provide details to start</p>
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
