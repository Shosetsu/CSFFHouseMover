import { effect, Injectable, signal } from '@angular/core';

/**
 * 支持的语言类型
 * - 'zh': 中文
 * - 'en': 英文
 */
export type SupportedLanguage = 'zh' | 'en';

/** 语言项类型，用于定义单个语言包中的键值对 */
export type LanguageItem = Record<string, string>;

/** 语言包类型，支持扁平字符串或嵌套对象结构 */
export type LangPacks = Record<string, string | LanguageItem>;

/**
 * 翻译服务
 * 提供多语言国际化支持，当前支持中文和英文
 * 功能包括：自动检测浏览器语言、动态加载语言包、翻译文本
 */
@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  /**
   * 当前选中的语言信号
   * 默认通过 detectLanguage() 自动检测浏览器语言
   * @default 'zh' (中文浏览器) 或 'en' (其他语言浏览器)
   */
  currentLang = signal<SupportedLanguage>(this.detectLanguage());

  /**
   * 语言变化副作用效果
   * 当 currentLang 变化时自动加载对应语言包
   */
  currentLangEffect = effect(() => {
    this.loadLanguage(this.currentLang());
  });

  /**
   * 当前加载的语言包信号
   * 中文时为空对象，pipe 会直接返回原文
   */
  langPack = signal<LangPacks>({});

  /**
   * 检测浏览器语言
   * 根据浏览器的 navigator.language 设置判断，中文浏览器返回 'zh'，其他返回 'en'
   *
   * @returns {SupportedLanguage} 检测到的语言代码
   * @private
   */
  private detectLanguage(): SupportedLanguage {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  }

  /**
   * 异步加载指定语言的翻译包
   * 中文时设置空对象（pipe 会直接返回原文），英文时从 JSON 文件动态导入
   *
   * @param {SupportedLanguage} lang - 要加载的语言类型
   * @returns {Promise<void>} 加载完成的 Promise
   */
  private async loadLanguage(lang: SupportedLanguage): Promise<void> {
    if (lang === 'zh') {
      // 中文时返回空对象，pipe 会直接返回原文
      this.langPack.set({});
    } else {
      try {
        const translations = await import('../../../public/lang/en.json');
        this.langPack.set(translations.default);
      } catch (error) {
        console.error('Failed to load language:', error);
        this.langPack.set({});
      }
    }
    // 更新html元数据
    document.title = this.t('title', '卡牌生存：奇幻森林 存档搬家工具');
    document.documentElement.lang = lang;
  }

  /**
   * 根据键获取翻译文本
   * 支持点分隔的嵌套键路径
   *
   * @param {string} key - 翻译键，支持点分隔的嵌套路径
   * @param {string} [defaultText] - 当找不到翻译时的默认文本
   * @returns {string} 翻译后的文本，如果找不到则返回 defaultText 或空字符串
   */
  t(key: string, defaultText?: string): string {
    const keys = key.split('.');
    const text =
      (keys?.reduce<LanguageItem | string | undefined>(
        (p, c) => (p as LanguageItem)?.[c],
        this.langPack() as LanguageItem,
      ) as string) ??
      defaultText ??
      '';
    return text;
  }
}
