import { Component, signal } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { LOCATIONS } from './const/const';
import { MatButton } from '@angular/material/button';

type Code = { code: string; label: string; key?: string; ref?: any; env?: string };

@Component({
  selector: 'app-root',
  imports: [MatFormField, MatLabel, MatSelect, MatOption, MatButton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  selectedHouse = signal<Code | undefined>(undefined);
  selectedDestination = signal<Code | undefined>(undefined);

  houses = signal<Code[]>([]);
  availableLocations = signal<Code[]>([]);

  saveFileName = '';
  data: any;

  async onFileSelected(file: HTMLInputElement): Promise<void> {
    this.saveFileName = file.files?.[0].name ?? '';
    this.data = JSON.parse((await file.files?.[0].text()) ?? '');
    this.setData();
    this.selectedHouse.set(this.houses()[0]);
  }

  private setData(): void {
    this.availableLocations.set(
      (this.data.EnvironmentsData as any[])
        .map((env) => {
          const [key, name] = env.DictionaryKey.slice(0, env.DictionaryKey.length - 1).split('(');
          return {
            code: key,
            key: name,
            label: LOCATIONS.find((lo) => lo.key === name)?.label ?? '',
            ref: env,
          };
        })
        .filter((env) => env.label)
    );

    this.houses.set(
      (this.data.EnvironmentsData as any[])
        .flatMap((env) => env.AllRegularCards as any[])
        .filter((card) => card.CardID.includes('ConstructionDoorEntranceMain'))
        .map((card) => {
          const envKey = card.EnvironmentKey.match(/\((.+)\)$/)[1];
          const type = {
            'Cabin)': '木屋',
            'ellar)': '地窖',
            'udHut)': '泥屋',
            'osure)': '畜栏',
          }[card.CardID.slice(-6) as string];

          return {
            code: envKey + card.CardID,
            label: `${card.CustomName || type}（${
              LOCATIONS.find((lo) => lo.key === envKey)?.label
            }）`,
            ref: card,
            key: type,
            env: envKey,
          };
        })
        .filter((env) => env.label)
    );
  }

  startMoving(): void {
    const current = this.selectedHouse()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()?.ref.DictionaryKey;

    // 先搬进屋卡
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, current.ref.EnvironmentKey);

    // 删掉旧进屋卡
    const oldEnvRegulars = (this.data.EnvironmentsData as any[]).find(
      (env) => env.DictionaryKey === oldEnv
    ).AllRegularCards as any[];
    oldEnvRegulars.splice(
      oldEnvRegulars.findIndex((card) => card.CardID === current.ref.CardID),
      1
    );
    // 添加新进屋卡
    const newEnvRegulars = (this.data.EnvironmentsData as any[]).find(
      (env) => env.DictionaryKey === newEnv
    ).AllRegularCards as any[];
    newEnvRegulars.push(current.ref);

    // 找房间ID
    const keyword =
      'StartingPoint' +
      {
        木屋: 'Cabin',
        地窖: 'Cellar',
        泥屋: 'MudHut',
        畜栏: 'Enclosure',
      }[current.key as string];

    const rpList = (this.data.EnvironmentsData as any[])
      .filter(
        (env) => env.DictionaryKey.includes(keyword) && env.DictionaryKey.includes(current.env)
      )
      .map((env) => ({
        old: env.DictionaryKey,
        new: env.DictionaryKey.replaceAll(oldEnv, newEnv),
      }));

    // 完全替换
    rpList.forEach((rps) => {
      console.log('changing: ', rps.old, '→', rps.new);
      this.replaceAllData(this.data, rps.old, rps.new);
      console.log(
        'changing: ',
        rps.old.replace(/\(.+?\)/g, ''),
        '→',
        rps.new.replace(/\(.+?\)/g, '')
      );
      this.replaceAllData(
        this.data,
        rps.old.replace(/\(.+?\)/g, ''),
        rps.new.replace(/\(.+?\)/g, '')
      );
    });
    this.setData();

    this.selectedHouse.set(
      this.houses().find(
        (house) =>
          house.code === current.code.replace(current.env!, this.selectedDestination()!.key!)
      )
    );
  }

  private replaceAllData(data: Record<string, any>, r1: string, r2: string): void {
    Object.keys(data).forEach(
      (key) => (data[key] = JSON.parse(JSON.stringify(data[key]).replaceAll(r1, r2)))
    );
  }

  saveArchive(): void {
    const jsonString = JSON.stringify(this.data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = this.saveFileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}
