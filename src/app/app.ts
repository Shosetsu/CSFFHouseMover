import { Component, computed, signal } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { LOCATIONS } from './const/const';
import { MatButton } from '@angular/material/button';
import { Card, EnvCard, SaveData } from './const/types';

type Code = {
  code: string;
  label: string;
  key?: string;
  ref: Card | EnvCard;
  env?: string;
  current?: boolean;
};

@Component({
  selector: 'app-root',
  imports: [MatFormField, MatLabel, MatSelect, MatOption, MatButton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  selectedHouse = signal<Code | undefined>(undefined);
  selectedDestination = signal<Code | undefined>(undefined);

  saveFileName = '';
  data = signal<SaveData | undefined>(undefined);

  private currentEnv?: EnvCard;

  houses = computed<Code[]>(() =>
    [
      ...(this.data()
        ?.EnvironmentsData.flatMap((env) => env.AllRegularCards)
        .filter(
          (card) =>
            card.CardID.includes('ConstructionDoorEntranceMain') &&
            this.currentEnv!.CardID !== card.EnvironmentKey
        ) ?? []),
      ...(this.data()?.CurrentCardsData.filter((card) =>
        card.CardID.includes('ConstructionDoorEntranceMain')
      ) ?? []),
    ]
      .map((card) => {
        const envKey = card.EnvironmentKey.match(/\((.+)\)$/)?.[1];
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
          current: this.currentEnv!.CardID === card.EnvironmentKey,
        };
      })
      .filter((env) => env.label)
  );

  availableLocations = computed<Code[]>(() =>
    (
      this.data()?.EnvironmentsData.map((env) => {
        const [key, name] = env.DictionaryKey.slice(0, env.DictionaryKey.length - 1).split('(');
        return {
          code: key,
          key: name,
          label: LOCATIONS.find((lo) => lo.key === name)?.label ?? '',
          ref: env,
          current: this.currentEnv!.CardID === env.DictionaryKey,
        };
      }) ?? []
    ).filter((env) => env.label)
  );

  async onFileSelected(file: HTMLInputElement): Promise<void> {
    this.saveFileName = file.files?.[0].name ?? '';
    this.data.set(JSON.parse((await file.files?.[0].text()) ?? ''));
    this.currentEnv = this.data()?.CurrentEnvironmentCard;
    this.selectedHouse.set(this.houses()[0]);
  }

  startMoving(): void {
    const current = this.selectedHouse()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = (this.selectedDestination()?.ref as EnvCard).DictionaryKey;

    const refData = this.data()!;

    // 先搬进屋卡
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, current.ref.EnvironmentKey);

    // 删掉旧进屋卡
    if (current.current) {
      // 如果在当前区域
      refData.CurrentCardsData.splice(
        this.data()!.CurrentCardsData.findIndex((card) => card === current.ref),
        1
      );
    } else {
      // 反之不在
      const oldEnvRegulars = refData.EnvironmentsData.find(
        (env) => env.DictionaryKey === oldEnv
      )!.AllRegularCards;
      oldEnvRegulars.splice(
        oldEnvRegulars.findIndex((card) => card === current.ref),
        1
      );
    }

    // 添加新进屋卡
    if (this.selectedDestination()!.current) {
      // 如果在当前区域
      refData.CurrentCardsData.push(current.ref);
    } else {
      // 反之不在
      const newEnvRegulars = refData.EnvironmentsData.find(
        (env) => env.DictionaryKey === newEnv
      )!.AllRegularCards;
      newEnvRegulars.push(current.ref);
    }

    // 找房间ID
    const keyword =
      'StartingPoint' +
      {
        木屋: 'Cabin',
        地窖: 'Cellar',
        泥屋: 'MudHut',
        畜栏: 'Enclosure',
      }[current.key as string];

    const rpList = refData.EnvironmentsData.filter(
      (env) =>
        env.DictionaryKey.includes(keyword) &&
        env.DictionaryKey.match(
          new RegExp(
            current.env +
              '\\)' +
              (current.ref.TravelCardIndex ? `=${current.ref.TravelCardIndex}` : '') +
              '($|_)'
          )
        )
    ).map((env) => ({
      old: env.DictionaryKey,
      new: env.DictionaryKey.replaceAll(oldEnv, newEnv),
    }));

    // 完全替换
    rpList.forEach((rps) => {
      this.replaceAllData(refData, rps.old, rps.new);
      this.replaceAllData(
        refData,
        rps.old.replace(/\(.+?\)/g, ''),
        rps.new.replace(/\(.+?\)/g, '')
      );
    });

    this.data.update(() => ({ ...refData }));

    this.selectedHouse.set(
      this.houses().find(
        (house) =>
          house.code === current.code.replace(current.env!, this.selectedDestination()!.key!)
      )
    );
  }

  private replaceAllData(data: Record<string, any>, r1: string, r2: string): void {
    console.log('changing: ', r1, '→', r2);
    Object.keys(data).forEach(
      (key) => (data[key] = JSON.parse(JSON.stringify(data[key]).replaceAll(r1, r2)))
    );
  }

  saveArchive(): void {
    const jsonString = JSON.stringify(this.data());
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
