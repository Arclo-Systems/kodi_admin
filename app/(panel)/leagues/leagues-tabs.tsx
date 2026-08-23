'use client';

import { SettingsIcon, TrophyIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeagueConfigForm } from './league-config-form';
import { LeagueStandings } from './league-standings';

export function LeaguesTabs({ allowedCountries }: { allowedCountries: string[] }) {
  return (
    <Tabs defaultValue="configuracion">
      <TabsList>
        <TabsTrigger value="configuracion">
          <SettingsIcon />
          Configuración
        </TabsTrigger>
        <TabsTrigger value="tabla">
          <TrophyIcon />
          Tabla
        </TabsTrigger>
      </TabsList>
      <TabsContent value="configuracion" className="mt-4">
        <LeagueConfigForm />
      </TabsContent>
      <TabsContent value="tabla" className="mt-4">
        <LeagueStandings allowedCountries={allowedCountries} />
      </TabsContent>
    </Tabs>
  );
}
