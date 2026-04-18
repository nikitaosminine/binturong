import { ThesisBodyBlock } from "@/lib/thesis";

interface ThesisBodyProps {
  blocks: ThesisBodyBlock[];
}

export function ThesisBody({ blocks }: ThesisBodyProps) {
  return (
    <div className="space-y-3 text-sm text-foreground/85">
      {blocks.map((block, i) => {
        if (block.type === "h") {
          return (
            <p key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
              {block.content as string}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="space-y-1 pl-4">
              {(block.content as string[]).map((item, j) => (
                <li key={j} className="relative before:absolute before:-left-3 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block.content as string}</p>;
      })}
    </div>
  );
}
