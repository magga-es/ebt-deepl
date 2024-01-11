import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { default as DeepLTranslator } from "./deepl.mjs"
import pkgMemoAgain from "memo-again"
const {
  Files
} = pkgMemoAgain;

import pkgScvBilara from "scv-bilara";
const { 
  BilaraData, 
  BilaraPathMap,
  Seeker,
} = pkgScvBilara;

import pkgScvEsm from 'scv-esm';
const {
  SuttaRef,
} = pkgScvEsm;

import {
  DBG_CREATE, DBG_FIND, DBG_LOAD_SUTTA, DBG_TRANSLATE,
} from './defines.mjs'

var creating = false;

const DST_LANG = 'pt';
const SRC_LANG = 'de';
const SRC_AUTHOR = 'sabbamitta';
const DST_AUTHOR = 'edited-ml';

export default class SuttaTranslator {
  constructor(opts={}) {
    const msg = 'SuttaTranslator.ctor()';

    if (!creating) {
      throw new Error(`${msg} use SuttaTranslator.create()`);
    }

    Object.assign(this, opts);
  }

  static async create(opts={}) {
    const msg = 'SuttaTranslator.create()';
    const dbg = DBG_CREATE;
    let {
      dstLang=DST_LANG,
      srcLang=SRC_LANG,
      srcAuthor = SRC_AUTHOR,
      dstAuthor=DST_AUTHOR,
      srcTransform,
      xltDeepL,
      bilaraData = await new BilaraData({
        name: 'ebt-data',
      }).initialize(),
    } = opts;

    if (xltDeepL == null) {
      let optsDeepL = { 
        srcLang,
        dstLang,
      }
      dbg && console.log(msg, '[1]DeepLTranslator.create', optsDeepL);
      xltDeepL = await DeepLTranslator.create(optsDeepL);
    }

    if (srcTransform == null) {
      if (1 && srcLang === 'de') {
        srcTransform = [{
          rex: /Mönch oder eine Nonne/g,
          rep: "Moench",
        }]
      }
    }

    let st;
    try {
      creating = true;
      st = new SuttaTranslator({
        xltDeepL,
        srcLang,
        srcAuthor,
        srcTransform,
        dstLang,
        dstAuthor,
        bilaraData,
      });
    } finally {
      creating = false;
    }

    return st;
  }

  static transformSource(text, srcTransform) {
    if (srcTransform) {
      srcTransform.forEach(xfm=>{
        text = text.replaceAll(xfm.rex, xfm.rep)
      });
    }
    return text;
  }

  static async loadSutta(suttaRef, opts={}) {
    const { srcTransform, bilaraData, } = opts;
    const msg = 'SuttaTranslator.loadSutta()';
    const dbg = DBG_LOAD_SUTTA;
    if ( bilaraData == null) {
      let emsg = `${msg} bilaraData is required`;
      throw new Error(emsg);
    }
    let sref = SuttaRef.create(suttaRef);
    let { sutta_uid, lang='pli', author='ms' } = sref;
    let { root, bilaraPathMap:bpm } = bilaraData;
    let bilaraPath = lang==='pli'
      ? bpm.suidPath(sutta_uid)
      : bpm.suidPath(`${sutta_uid}/${lang}/${author}`);
    try {
      var filePath = path.join(root, bilaraPath);
      var rawText = (await fs.promises.readFile(filePath)).toString();
      rawText = SuttaTranslator.transformSource(rawText, srcTransform);
      dbg && console.log('rawtext', rawText);
      var segments = JSON.parse(rawText);
    } catch(e) {
      dbg && console.log(msg, '[1]not found:', sref, bilaraPath, e);
    }

    return {
      sutta_uid,
      lang, 
      author,
      bilaraPath,
      filePath,
      segments, 
    }
  }

  async loadSutta(suttaRef, opts={}) {
    let { srcTransform, bilaraData } = this;
    return SuttaTranslator.loadSutta(suttaRef, {
      srcTransform,
      bilaraData,
    });
  }

  async translate(sutta_uid) {
    const msg = 'SuttaTranslator.translate()';
    const dbg = DBG_TRANSLATE;
    let { 
      seeker, srcLang, srcAuthor, dstLang, dstAuthor, 
      bilaraData, xltDeepL,
    } = this;
    let { root, bilaraPathMap:bpm } = bilaraData;
    let srcRef = SuttaRef.create({
      sutta_uid, lang: srcLang, author: srcAuthor});
    let {
      segments: srcSegs,
      filePath: srcPath,
    } = await this.loadSutta(srcRef);
    let scids = Object.keys(srcSegs);
    let srcTexts = scids.map(scid=>srcSegs[scid]);

    let resXlt = await xltDeepL.translate(srcTexts);
    let dstTexts = resXlt.map(r=>r.text);
    let dstSegs = scids.reduce((a,scid,i)=>{
      a[scid] = dstTexts[i];
      return a;
    }, {});
    let dstRef = SuttaRef.create(sutta_uid, dstLang);
    dstRef.author = dstAuthor;
    let dstPath = bpm.suidPath(sutta_uid);
    dstPath = dstPath
      .replace('_root-pli-ms', `_translation-${dstLang}-${dstAuthor}`)
      .replace('root/pli/', `translation/${dstLang}/`)
      .replace('/ms/', `/${dstAuthor}/`);
    dstPath = dstPath && path.join(root, dstPath);

    return {
      srcRef, srcPath, srcSegs,
      dstRef, dstPath, dstSegs,
    }
  }

}
