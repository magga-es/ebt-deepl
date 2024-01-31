const QUOTE  = '“'; // Quotation mark
const APQUOT = "'"; // Apostrophe/single-quote
const LSQUOT = '‘'; // Left single quote
const RSQUOT = '’'; // Right single quote, curly apostrophe
const LGUIL  = '«'; // Left guillemet
const RGUIL  = '»'; // Right guillemet
const NBSP   = '\u00a0'; // non-breaking space
const LDQUOT = '“'; // Left double quote
const RDQUOT = '”'; // Right double quote

// Deepl 
const LQ1 = '<w>'; 
const LQ2 = '<x>';
const LQ3 = '<y>';
const LQ4 = '<z>';
const RQ1 = '</w>'; 
const RQ2 = '</x>';
const RQ3 = '</y>';
const RQ4 = '</z>';

import {
  DBG_QUOTE, DBG_VERBOSE,
} from './defines.mjs';

export default class QuoteParser {
  constructor(opts={}) {
    const msg = 'QuoteParser.ctor()';
    const dbg = DBG_QUOTE;
    let {
      lang = 'en',
      openQuotes,
      closeQuotes,
      level = 0,
      maxLevel = 4,
      quotes = 0,
    } = opts;

    lang = lang.toLowerCase();
    openQuotes = openQuotes && [...openQuotes];
    closeQuotes = closeQuotes && [...closeQuotes];

    switch (lang) {
      case 'en-uk': // UK quote nesting
        openQuotes = openQuotes || [ LSQUOT, LDQUOT, LSQUOT, LDQUOT ];
        closeQuotes = closeQuotes || [ RSQUOT, RDQUOT, RSQUOT, RDQUOT ];
        break;
      case 'pt-br':
      case 'en-us':
      case 'en': // American quote nesting 
        openQuotes = openQuotes || [ LDQUOT, LSQUOT, LDQUOT, LSQUOT ];
        closeQuotes = closeQuotes || [ RDQUOT, RSQUOT, RDQUOT, RSQUOT ];
        break;
      case 'pt':
      case 'pt-pt':
        openQuotes = openQuotes || [ LGUIL, LDQUOT, LSQUOT, LDQUOT ];
        closeQuotes = closeQuotes || [ RGUIL, RDQUOT, RSQUOT, RDQUOT ];
        break;
        openQuotes = openQuotes || [ LDQUOT, LSQUOT ];
        closeQuotes = closeQuotes || [ RDQUOT, RSQUOT ];
        break;
      case 'fr':
        openQuotes = openQuotes || 
          [ LGUIL+NBSP, LDQUOT, LSQUOT, LDQUOT ];
        closeQuotes = closeQuotes || 
          [ NBSP+RGUIL, RDQUOT, RSQUOT, RDQUOT ];
        break;
      case 'fr-deepl':
      case 'pt-deepl':
      case 'en-deepl':
        openQuotes = openQuotes || [ LQ1, LQ2, LQ3, LQ4 ];
        closeQuotes = closeQuotes || [ RQ1, RQ2, RQ3, RQ4 ];
        break;
      default: {
        let emsg = `${msg} unsupported language:${lang}`;
        throw new Error(emsg);
      } break;
    }
    
    let allQuotes = [...openQuotes, ...closeQuotes ];
    let rexQuotes = new RegExp(`(${allQuotes.join('|')})`, 'g');
    for (let i=0; i<maxLevel; i++) {
      openQuotes[i] = openQuotes[i] || openQuotes[i-1];
      closeQuotes[i] = closeQuotes[i] || closeQuotes[i-1];
    }

    Object.assign(this, {
      closeQuotes,
      lang,
      level,
      openQuotes,
      rexQuotes,
      maxLevel,
      quotes,
    });
  }

  static testcaseQ2EN(lang) {
    const {LQ1, LQ2, LQ3, LQ4, RQ1, RQ2, RQ3, RQ4} = QuoteParser;
    return [
      // LQ1 in preceding segment
      `${LQ2}I say, `,
      `${LQ3}You say, `,
      `${LQ4}I said ${lang}!${RQ4}`,
      `?${RQ3}.`,
      `${RQ2}`,
      `${RQ1}`, // closing 
    ].join('');
  }

  static testcaseDepthEN(lang) {
    const {LQ1, LQ2, LQ3, LQ4, RQ1, RQ2, RQ3, RQ4} = QuoteParser;
    return [
      `${LQ1}`,
      `${LQ2}I say, `,
      `${LQ3}You say, `,
      `${LQ4}I said ${lang}!${RQ4}`,
      `?${RQ3}.`,
      `${RQ2}`,
      `${RQ1}`,
    ].join('');
  }

  static APQUOTNBSP() { return APQUOT; }
  static get LDQUOT() { return LDQUOT; }
  static get RDQUOT() { return RDQUOT; }
  static get LSQUOT() { return LSQUOT; }
  static get RSQUOT() { return RSQUOT; }
  static get LGUIL() { return LGUIL; }
  static get RGUIL() { return RGUIL; }
  static get NBSP() { return NBSP; }
  static get QUOTE() { return QUOTE; }
  static get LQ1() { return LQ1; }
  static get LQ2() { return LQ2; }
  static get LQ3() { return LQ3; }
  static get LQ4() { return LQ4; }
  static get RQ1() { return RQ1; }
  static get RQ2() { return RQ2; }
  static get RQ3() { return RQ3; }
  static get RQ4() { return RQ4; }

  // LQ2.....RQ2 RQ1
  testcaseRebirthEN(lang) {
    const [ LQ1, LQ2, LQ3, LQ4 ] = this.openQuotes;
    const [ RQ1, RQ2, RQ3, RQ4 ] = this.closeQuotes;
    return [
      //`${LQ1}`,
      `${LQ2}I understand: `,
      `${LQ3}`,
      `Rebirth is ended in ${lang}`,
      `${RQ3}`,
      `${RQ2}`,
      '?',
      `${RQ1}`,
    ].join('');
  }

  // ... RQ2
  testcaseFeelingsEN(lang) {
    const [ LQ1, LQ2, LQ3, LQ4 ] = this.openQuotes;
    const [ RQ1, RQ2, RQ3, RQ4 ] = this.closeQuotes;
    return [
      `when it comes to ${lang} feelings?${RQ2}`  
    ].join('');
  }

  scan(text, level=this.level) {
    const msg = 'QuoteParser.scan()';
    const dbg = DBG_QUOTE;
    const dbgv = DBG_VERBOSE && dbg;
    let { 
      rexQuotes, openQuotes, closeQuotes, maxLevel,
    } = this;
    let quotes = 0;
    let execRes;
    while ((execRes=rexQuotes.exec(text)) !== null) {
      let match = execRes[0];
      dbgv && console.log(msg, match);
      quotes++;
      if (match === closeQuotes[level-1]) {
        level--;
        if (level < 0) {
          let emsg = `${msg} unmatched close quote: ${text}`;
          console.warn(msg, emsg);
          throw new Error(emsg);
        }
      } else if (match === openQuotes[level]) {
        level++;
        if (maxLevel < level) {
          let emsg = `${msg} quote nesting exceeded: ${text}`;
          console.warn(msg, emsg);
          throw new Error(emsg);
        }
      } else {
        let emsg = `${msg} invalid quote [${match}] for level:${level}`;
        console.warn(msg, emsg);
        throw new Error(emsg);
      }
    }

    return { 
      level, 
      quotes,
    };
  }

  parse(text, level) {
    const msg = 'QuoteParser.parse()';
    const dbg = DBG_QUOTE;
    let dState = this.scan(text, level);
    if (dbg) {
      console.log(msg, dState);
    }

    this.level = dState.level;
    this.quotes += dState.quotes;

    return dState;
  }

  convertQuotes(text, qpSwap, level=this.level) {
    const msg = 'QuoteParser.convertQuotes()';
    const dbg = DBG_VERBOSE;
    let { 
      openQuotes:srcOpen, 
      closeQuotes:srcClose, 
      rexQuotes, 
      maxLevel,
    } = this;
    if (qpSwap == null) {
      return text;
    }
    let {
      openQuotes:swapOpen,
      closeQuotes:swapClose,
    } = qpSwap;

    let dstParts = [];
    let srcParts = text.split(rexQuotes);
    dbg && console.log(msg, '[1]quotes', 
      `"${srcOpen[level]}"`, 
      `"${srcClose[level-1]}"`, 
    );
    for (let i=0; i<srcParts.length; i++) {
      let part = srcParts[i];

      if (part === srcClose[level-1]) {
        dbg && console.log(msg, `[2]close${i}`, part);
        level--;
        part = swapClose[level];
        if (level < 0) {
          let emsg = `${msg} unmatched close quote: ${text}`;
          console.warn(msg, emsg);
          throw new Error(emsg);
        }
      } else if (part === srcOpen[level]) {
        dbg && console.log(msg, `[3]open${i}`, part);
        part = swapOpen[level];
        level++;
        if (maxLevel < level) {
          let emsg = `${msg} quote nesting exceeded: ${text}`;
          console.warn(msg, emsg);
          throw new Error(emsg);
        }
      } else {
        dbg && console.log(msg, `[4]skip${i}`, level, 
          `"${part}"`, 
        );
        // not a quote
      }
      dstParts.push(part)
    }
    this.level = level;

    return dstParts.join('');
  }

  quotationLevel(text='') {
    const msg = 'QuoteParser.quotationLevel()';
    const dbg = DBG_VERBOSE;
    let { maxLevel, rexQuotes, openQuotes, closeQuotes } = this;
    let execRes = rexQuotes.exec(text);
    try {
      if (execRes == null) {
        dbg && console.log(msg, '[1]no-quotes', text);
        return 0;
      }
      let [ match ] = execRes;
      for (let i=0; i<maxLevel; i++) {
        if (match === openQuotes[i]) {
          dbg && console.log(msg, `[2]level${i} openQuotes`, text);
          return i;
        }
        if (match === closeQuotes[i]) {
          dbg && console.log(msg, `[3]level${i} closeQuotes`, text);
          return i+1;
        }
      }
      dbg && console.log(msg, '[4]no-match?');
      return 0;
    } finally {
      rexQuotes.exec(''); // reset rexQuotes
      //dbg && console.log('reset rexQuotes', rexQuotes.lastIndex);
    }
  }

}
