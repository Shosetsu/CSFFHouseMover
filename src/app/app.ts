import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { LOCATIONS } from './app.config';
import { Card, EnvCard, MoverOption, SaveData } from './app.interface';

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
  /** 选中的目标卡片选项 */
  selectedTarget = signal<MoverOption<Card> | undefined>(undefined);
  /** 选中的目标环境卡片选项 */
  selectedDestination = signal<MoverOption<EnvCard> | undefined>(undefined);

  /** 存档文件名 */
  saveFileName = '';
  /** 存档数据 */
  private data = signal<SaveData | undefined>(undefined);

  /** 当前环境卡片 */
  private currentEnv?: EnvCard;

  /** 非搬房子模式标识 */
  notHouse = signal(false);
  /** 搜索目标卡片的关键字 */
  targetKey = signal('GardenPlot');
  /** 预设的一些关键字 */
  keysets = [
    { value: 'GardenPlot', label: '菜园' },
    { value: 'RainCistern', label: '雨水窖' },
    { value: 'TanningPit', label: '鞣制坑' },
    { value: 'Trap', label: '各种陷阱' },
    { value: 'Field', label: '各种大田' },
  ];

  /** 用于触发计算的信号 */
  private tick = signal(false);

  /**
   * 计算目标列表
   * 根据notHouse标志返回不同类型的卡片列表
   * @returns MoverOption<Card>[] 目标卡片选项数组
   */
  targetList = computed<MoverOption<Card>[]>(() => {
    this.tick();
    if (this.notHouse()) {
      return [
        ...(this.data()?.CurrentInventoryCards || []),
        ...(this.data()?.CurrentCardsData || []),
      ]
        .filter((card) => card.CardID.includes(this.targetKey()) && !card.CardID.includes('Bp_'))
        .map<MoverOption<Card>>((card) => {
          const envKey = card.EnvironmentKey.match(/\((.+)\)$/)?.[1];

          return {
            code: String(card.CreatedOnTick),
            label: `${
              card.CustomName || card.CardID.match(/\((.+)\)/)?.[1] || card.CardID
            }（${this.getName(envKey, card.EnvironmentKey)}）`,
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
      .map<MoverOption<Card>>((card) => {
        const envKey = card.EnvironmentKey.match(/\((.+)\)$/)?.[1];
        const type = {
          'Cabin)': '木屋',
          'ellar)': '地窖',
          'udHut)': '泥屋',
          'osure)': '畜栏',
        }[card.CardID.slice(-6)];

        return {
          label: `${
            card.CustomName || type || card.CardID.match(/\((.+)\)/)?.[1] || card.CardID
          }（${this.getName(envKey)}）`,
          ref: card,
          type: type,
          env: envKey,
          current: this.currentEnv!.CardID === card.EnvironmentKey,
        };
      })
      .filter((env) => env.label);
  });

  /**
   * 目标列表变化时的副作用
   * 当目标列表变化时，自动更新选中的目标
   */
  targetListEffect = effect(() => {
    this.selectedTarget.set(
      this.targetList().find(
        (target) => JSON.stringify(target.ref) === JSON.stringify(this.selectedTarget()?.ref)
      ) ?? this.targetList()[0]
    );
  });

  /**
   * 计算可用位置列表
   * @returns MoverOption<EnvCard>[] 可用环境卡片选项数组
   */
  availableLocations = computed<MoverOption<EnvCard>[]>(() =>
    (
      this.data()?.EnvironmentsData.map<MoverOption<EnvCard>>((envCard) => {
        const name = envCard.DictionaryKey.slice(0, envCard.DictionaryKey.length - 1).split('(')[1];
        return {
          env: name,
          label: this.getName(name, name),
          ref: envCard,
          current: this.currentEnv!.CardID === envCard.DictionaryKey,
        };
      }) ?? []
    ).filter((env) => env.label)
  );

  /**
   * 处理文件选择事件
   * 读取并解析选中的存档文件
   * @param file HTML文件输入元素
   */
  async selectSaveFile(file: HTMLInputElement): Promise<void> {
    try {
      this.saveFileName = file.files?.[0].name ?? '';
      this.data.set(JSON.parse((await file.files?.[0].text()) ?? ''));
      this.currentEnv = this.data()?.CurrentEnvironmentCard;
      this.selectedTarget.set(this.targetList()[0]);
    } catch {
      this.saveFileName = '';
      this.data.set(undefined);
    }
  }

  /**
   * 开始移动卡片
   * 将选中的卡片从一个环境移动到另一个环境
   */
  moveHouse(): void {
    const refData = this.data()!;
    const current = this.selectedTarget()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()!.ref.DictionaryKey;

    // 更新入口卡片
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, '→', current.ref.EnvironmentKey);

    // 删掉旧入口
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

    // 添加新入口
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
      }[current.type!];

    // 完全替换
    refData.EnvironmentsData.filter(
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
    ).forEach((env) => {
      const oldKey = env.DictionaryKey;
      const newKey = env.DictionaryKey.replaceAll(oldEnv, newEnv);
      this.replaceAllData(refData, oldKey, newKey);
      this.replaceAllData(refData, oldKey.replace(/\(.+?\)/g, ''), newKey.replace(/\(.+?\)/g, ''));
    });

    this.tick.update((t) => !t);
  }

  /**
   * 替换数据中的所有匹配项
   * 递归替换对象中所有包含r1的字符串为r2
   * @param data 要处理的数据对象
   * @param r1 原始字符串
   * @param r2 替换字符串
   */
  private replaceAllData(data: SaveData, r1: string, r2: string): void {
    console.log('changing: ', r1, '→', r2);
    (Object.keys(data) as (keyof SaveData)[]).forEach(
      (key) => (data[key] = JSON.parse(JSON.stringify(data[key]).replaceAll(r1, r2)))
    );
  }

  /**
   * 移动其他卡片
   * 只更新卡片的环境键值
   */
  moveCard(): void {
    const current = this.selectedTarget()!;
    const oldEnv = current.ref.EnvironmentKey;
    const newEnv = this.selectedDestination()!.ref.DictionaryKey;

    // 更新卡片
    current.ref.EnvironmentKey = newEnv;
    console.log('changed: ', oldEnv, '→', current.ref.EnvironmentKey);

    this.tick.update((t) => !t);
  }

  /**
   * 下载修改过的存档文件
   * 将当前数据导出为JSON文件并触发下载
   */
  download(): void {
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

  /**
   * 根据键值获取位置名称
   * 从LOCATIONS常量中查找对应键值的位置标签，如果找不到则返回默认值
   * 在查找前会移除键值末尾的Q、E、W字符
   * @param key 位置键值，可选参数
   * @param defaultValue 当找不到对应位置时的默认返回值，默认为空字符串
   * @returns 对应的位置名称或默认值
   */
  private getName(key?: string, defaultValue = ''): string {
    return (
      (key && LOCATIONS.find((loc) => loc.key === key.replace(/(Q|E|W)+$/g, ''))?.label) ??
      defaultValue
    );
  }
}
