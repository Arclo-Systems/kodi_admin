'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayersIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { COUNTRIES } from '@/lib/countries';
import { useReviewMaterialOverview } from '@/hooks/use-review-material';
import { PieceBadge } from './piece-badge';

const ALL_COUNTRIES = 'DEFAULT';

export function ReviewMaterialTree() {
  const [country, setCountry] = useState<string>(ALL_COUNTRIES);
  const filter = country === ALL_COUNTRIES ? null : country;
  const { data, isLoading, isError, error } = useReviewMaterialOverview(filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-52" aria-label="Filtrar por país">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_COUNTRIES}>Todos los países</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'No se pudo cargar el material de repaso.'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState
          icon={<LayersIcon />}
          message="No hay módulos para ese país"
          description="Creá el módulo y sus temas en Temas y módulos; el material cuelga de cada tema."
        />
      )}

      {!isLoading &&
        !isError &&
        data?.map((examModule) => (
          <Card key={examModule.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-2">
                <span>{examModule.shortName}</span>
                <span className="text-muted-foreground text-sm font-normal">
                  {examModule.country} · {examModule.fullName}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {examModule.subjects.length === 0 && (
                <p className="text-muted-foreground text-sm">Este módulo todavía no tiene materias.</p>
              )}
              {examModule.subjects.map((subject) => (
                <section key={subject.id} className="space-y-2">
                  <h3 className="text-sm font-semibold">{subject.name}</h3>
                  {subject.topics.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Sin temas.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tema</TableHead>
                            <TableHead>Tarjetas</TableHead>
                            <TableHead>Resumen</TableHead>
                            <TableHead>Podcast</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subject.topics.map((topic) => (
                            <TableRow key={topic.id}>
                              <TableCell>
                                <Link
                                  href={`/content/review-material/${topic.id}`}
                                  className="hover:text-primary font-medium underline-offset-4 hover:underline"
                                >
                                  {topic.name}
                                </Link>
                                {/* El primer tema de cada materia es la probadita gratis del feature. */}
                                {topic.order === 0 && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    probadita gratis
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <PieceBadge
                                  state={topic.flashcards}
                                  suffix={
                                    topic.cardCount > 0 ? `${topic.cardCount} tarjetas` : undefined
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <PieceBadge state={topic.summary} />
                              </TableCell>
                              <TableCell>
                                <PieceBadge state={topic.podcast} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
