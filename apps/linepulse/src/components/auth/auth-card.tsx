import { BrandMark } from '@/components/shell/brand-mark';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@igaming/ui';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-start gap-2">
        <BrandMark className="text-lg" />
        <CardTitle className="pt-2 text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
