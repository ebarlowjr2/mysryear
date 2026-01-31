import { NextResponse } from "next/server";

interface WebFormData {
  get(name: string): FormDataEntryValue | null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData() as unknown as WebFormData;
    const file = formData.get("file");
    
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }
    
    const name = (file as File).name || "uploaded.file";
    
    return NextResponse.json({ ok: true, fileName: name });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
