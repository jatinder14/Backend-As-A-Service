// English
import { EnglishLanguage } from './en';
import { enFilterComponent } from '@/language/en/filter-component';
import { enLayout } from './en/layout';
// French
import { FrenchPageLanguage } from './fr';
import { frFilterComponent } from '@/language/fr/filter-component';
import { frLayout } from './fr/layout';

// Arabic
import { ArabicPageLanguage } from './ar';
import { arFilterComponent } from '@/language/ar/filter-component';
import { arLayout } from './ar/layout';

// Italic
import { ItPageLanguage } from './it';
import { itFilterComponent } from '@/language/it/filter-component';
import { itLayout } from './it/layout';

// farsi
import { faPageLanguage } from './fa';
import { faFilterComponent } from '@/language/fa/filter-component';
import { faLayout } from './fa/layout';

// dutch
import { nlPageLanguage } from './nl';
import { nlFilterComponent } from '@/language/nl/filter-component';
import { nlLayout } from './nl/layout';

// Chinease
import { zhCnPageLanguage } from './zh-CN';
import { zhCnFilterComponent } from '@/language/zh-CN/filter-component';
import { zhCnLayout } from './zh-CN/layout';

// Turkish
import { trPageLanguage } from './tr';
import { trFilterComponent } from '@/language/tr/filter-component';
import { trLayout } from './tr/layout';

// German
import { dePageLanguage } from './de';
import { deFilterComponent } from '@/language/de/filter-component';
import { deLayout } from './de/layout';

// RO = Romanian
import { roPageLanguage } from './ro';
import { roFilterComponent } from '@/language/ro/filter-component';
import { roLayout } from './ro/layout';

// HI = Hindi
import { HindiLanguage } from './hi';
import { hiFilterComponent } from '@/language/hi/filter-component';
import { hiLayout } from './hi/layout';

/* Handler to set page language */
export const selectedLanguage = (language: any, route: any) => {
  // english
  if (language === 'EN') {
    return {
      language: EnglishLanguage(route),
      filterComponent: enFilterComponent,
      layoutLanguage: enLayout,
    };
  }
  // french
  else if (language === 'FR') {
    return {
      language: FrenchPageLanguage(route),
      filterComponent: frFilterComponent,
      layoutLanguage: frLayout,
    };
  }
  // arabic
  else if (language === 'AR') {
    return {
      language: ArabicPageLanguage(route),
      filterComponent: arFilterComponent,
      layoutLanguage: arLayout,
    };
  }
  // italic
  else if (language === 'IT') {
    return {
      language: ItPageLanguage(route),
      filterComponent: itFilterComponent,
      layoutLanguage: itLayout,
    };
  }
  // italic
  else if (language === 'IT') {
    return {
      language: ItPageLanguage(route),
      filterComponent: itFilterComponent,
      layoutLanguage: itLayout,
    };
  }
  // farsi
  else if (language === 'FA') {
    return {
      language: faPageLanguage(route),
      filterComponent: faFilterComponent,
      layoutLanguage: faLayout,
    };
  }
  // Dutch
  else if (language === 'NL') {
    return {
      language: nlPageLanguage(route),
      filterComponent: nlFilterComponent,
      layoutLanguage: nlLayout,
    };
  }
  // chinease
  else if (language === 'ZH-CN') {
    return {
      language: zhCnPageLanguage(route),
      filterComponent: zhCnFilterComponent,
      layoutLanguage: zhCnLayout,
    };
  }
  // turkish
  else if (language === 'TR') {
    return {
      language: trPageLanguage(route),
      filterComponent: trFilterComponent,
      layoutLanguage: trLayout,
    };
  }
  // german
  else if (language === 'DE') {
    return {
      language: dePageLanguage(route),
      filterComponent: deFilterComponent,
      layoutLanguage: deLayout,
    };
  }
  // romanian
  else if (language === 'RO') {
    return {
      language: roPageLanguage(route),
      filterComponent: roFilterComponent,
      layoutLanguage: roLayout,
    };
  }
  // Hindi
  else if (language === 'HI') {
    return {
      language: HindiLanguage(route),
      filterComponent: hiFilterComponent,
      layoutLanguage: hiLayout,
    };
  }
  // default english
  else {
    return {
      language: EnglishLanguage(route),
      filterComponent: enFilterComponent,
      layoutLanguage: enLayout,
    };
  }
};
