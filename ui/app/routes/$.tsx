import { MetaFunction } from "@remix-run/node";
import { NotFoundPage } from "@/components/not-found-page";

export const meta: MetaFunction = () => {
  return [
    { title: "Not Found | MD Studio" },
    { name: "robots", content: "noindex" },
  ];
};

export default function NotFound() {
  return <NotFoundPage />;
}
