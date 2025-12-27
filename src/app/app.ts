import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { LOCATIONS } from './const/const';
import { Card, EnvCard, SaveData } from './const/types';

type Code<T extends Card> = {
  code: string;
  label: string;
  key?: string;
  ref: T;
  env?: string;
  current?: boolean;
};

@Component({
  selector: 'app-root',
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatCheckbox,
    MatAutocompleteModule,
    MatInput,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  selectedTarget = signal<Code<Card> | undefined>(undefined);
  selectedDestination = signal<Code<EnvCard> | undefined>(undefined);

  saveFileName = '';
  data = signal<SaveData | undefined>(undefined);

  private currentEnv?: EnvCard;

  notHouse = signal(false);
  targetKey = signal('f853a0a8ad6c64c4b81eabb8367c0c5c(GardenPlot)');
  keysets = [
    { value: 'f853a0a8ad6c64c4b81eabb8367c0c5c(GardenPlot)', label: '菜园' },
    { value: '536f722edbb5e9e4b959b1f3ad25f648(RainCistern)', label: '雨水窖' },
    { value: '5a3586eda3d3bca49bef4e3cab7b28e1(TanningPit)', label: '鞣制坑' },
  ];

  houses = computed<Code<Card>[]>(() => {
    if (this.notHouse()) {
      return [
        ...(this.data()?.CurrentInventoryCards || []),
        ...(this.data()?.CurrentCardsData || []),
      ]
        .filter((card) => card.CardID.includes(this.targetKey()) && !card.CardID.includes('Bp_'))
        .map((card) => {
          const envKey = card.EnvironmentKey.match(/\((.+)\)$/)?.[1];

          return {
            code: String(card.CreatedOnTick),
            label: `${card.CustomName || card.CardID.match(/\((.+)\)/)?.[1] || card.CardID}（${
              LOCATIONS.find((lo) => lo.key === envKey)?.label
            }）`,
            ref: card,
            env: envKey,
            current: this.currentEnv!.CardID === card.EnvironmentKey,
          };
        });
    }
    return [
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
          label: `${
            card.CustomName || type || card.CardID.match(/\((.+)\)/)?.[1] || card.CardID
          }（${LOCATIONS.find((lo) => lo.key === envKey)?.label}）`,
          ref: card,
          key: type,
          env: envKey,
          current: this.currentEnv!.CardID === card.EnvironmentKey,
        };
      })
      .filter((env) => env.label);
  });

  availableLocations = computed<Code<EnvCard>[]>(() =>
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
    this.selectedTarget.set(this.houses()[0]);
  }

  startMoving(): void {
    const refData = this.data()!;
    const current = this.selectedTarget()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()!.ref.DictionaryKey;

    // 先搬进屋卡
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, '→', current.ref.EnvironmentKey);

    // 删掉旧卡
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

    // 添加新卡
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

    // 只有搬房子才需要
    this.moveHouseEnv();

    this.data.update(() => ({ ...refData }));

    this.selectedTarget.set(
      this.houses().find(
        (house) =>
          house.code === current.code.replace(current.env!, this.selectedDestination()!.key!)
      )
    );
  }

  startMovingOther(): void {
    const refData = this.data()!;
    const current = this.selectedTarget()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()!.ref.DictionaryKey;

    // 改卡
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, '→', current.ref.EnvironmentKey);

    this.data.update(() => ({ ...refData }));

    this.selectedTarget.set(
      this.houses().find(
        (house) =>
          house.code === current.code.replace(current.env!, this.selectedDestination()!.key!)
      )
    );
  }

  private moveHouseEnv(): void {
    const refData = this.data()!;
    const current = this.selectedTarget()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()!.ref.DictionaryKey;

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
