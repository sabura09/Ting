"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenTool, Copy, Download, Wand2 } from "lucide-react";
import { useGeminiStream } from "@/hooks/useGeminiStream";
import { systemPrompts } from "@/config/prompts";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const contentTypes = [
  { value: "blog", label: "Blog Post" },
  { value: "marketing", label: "Marketing Copy" },
  { value: "product", label: "Product Description" },
  { value: "social", label: "Social Media Post" },
  { value: "email", label: "Email Newsletter" },
  { value: "article", label: "Article" },
];

export default function WriterPage() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("");

  const [output, setOutput] = useState("");
  const { toast } = useToast();
  const { generateStream, isStreaming, streamedText } = useGeminiStream();

  const handleGenerate = async () => {
    if (!topic.trim() || !contentType) {
      toast({
        title: "Missing Information",
        description: "Please provide a topic and select a content type.",
        variant: "destructive"
      });
      return;
    }

    const prompt = `Create ${contentType} content about: ${topic}
    ${keywords ? `Keywords to include: ${keywords}` : ""}
    ${tone ? `Tone: ${tone}` : ""}
    
    Please make it engaging, SEO-friendly, and professionally written.`;

    try {
      const response = await generateStream(systemPrompts.writer, prompt, undefined, undefined, 'writer');

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive"
        });
      } else {
        setOutput(response.text);
        toast({
          title: "Content Generated!",
          description: "Your content has been successfully created.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard.",
    });
  };

  const downloadText = () => {
    const element = document.createElement("a");
    const file = new Blob([output], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${contentType}-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <PenTool className="w-6 h-6 text-ai-primary" />
          <h1 className="text-2xl font-bold">AI Content Writer</h1>
        </div>
        <p className="text-muted-foreground">
          Generate high-quality content including blog posts, marketing copy, product descriptions, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100%-120px)]">
        {/* Input Section */}
        <Card className="ai-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Content Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic/Subject *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Benefits of Remote Work"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type *</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (Optional)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., productivity, efficiency, work-life balance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone (Optional)</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="persuasive">Persuasive</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isStreaming}
              className="w-full"
            >
              {isStreaming ? "Generating..." : "Generate Content"}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="ai-card flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Content
              {output && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadText}>
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
                        className="h-full resize-none border-0 focus-visible:ring-0 p-0"
                        placeholder="Your generated content will appear here..."
                        readOnly={isStreaming}
                      />
                    </TabsContent>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Generated content will appear here</p>
                      <p className="text-sm mt-2">Fill in the details and click "Generate Content" to start</p>
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
