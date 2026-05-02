import PostEditor from "@/components/PostEditor";

export const metadata = { title: "Edit Post — Mugen Admin" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditor postId={id} />;
}
