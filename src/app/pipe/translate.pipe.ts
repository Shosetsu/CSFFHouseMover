import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../service/translation.service';

/**
 * 翻译管道
 * 用于在模板中直接获取翻译文本
 * 当找不到对应翻译时，会返回传入的中文原文作为默认值
 */
@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  /** 翻译服务实例 */
  private translate = inject(TranslationService);

  /**
   * 转换方法
   *
   * @param {string} chineseText - 中文原文，当找不到翻译时作为默认值返回
   * @param {string} key - 翻译键，支持点分隔的嵌套路径
   * @returns {string} 翻译后的文本，或中文原文
   */
  transform(chineseText: string, key: string): string {
    return this.translate.t(key, chineseText);
  }
}
