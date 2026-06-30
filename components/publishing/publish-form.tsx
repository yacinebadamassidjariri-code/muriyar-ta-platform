"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { publishStory } from "@/lib/actions/publishing/publish-story";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PublishForm({
  submissionId,
  initialBody,
}: {
  submissionId: string;
  initialBody: string;
}) {
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

function onPublish() {
  console.log("BUTTON CLICKED");

  setError(null);

  if (!title.trim()) {
    console.log("TITLE FAILED");
    setError("Title is required.");
    return;
  }

  if (!body.trim()) {
    console.log("BODY FAILED");
    setError("Story body is required.");
    return;
  }

  console.log("STARTING TRANSITION");

  startTransition(async () => {
    console.log("CALLING RPC");

    const result = await publishStory({
      submissionId,
      title,
      body,
    });

    console.log("RPC RESULT:", result);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/admin/publishing");
  });
}

  return (
    <Card className="space-y-6 p-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Story title"
        />
      </div>

      <div>
        <Label htmlFor="body">Story Body</Label>
        <Textarea
          id="body"
          rows={16}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>



<Button
  onClick={() => {
    console.log("BUTTON CLICKED");
    onPublish();
  }}
  disabled={pending}
>
  {pending ? "Publishing..." : "Publish"}
</Button>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}
    </Card>
  );
}