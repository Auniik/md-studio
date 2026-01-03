import { ChevronRightIcon, HomeIcon } from "lucide-react";
import { Link, useNavigate } from "@remix-run/react";
import { Button } from "@/components/ui/button";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  dashboardPath?: string;
};

export function Breadcrumb({
  items,
  showBackButton = true,
  dashboardPath = "/",
}: BreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-1 h-8 px-2"
        >
          ← Back
        </Button>
      )}
      <Link
        to={dashboardPath}
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <HomeIcon className="size-4" />
        <span>Documents</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRightIcon className="size-4" />
          {item.href ? (
            <Link
              to={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
