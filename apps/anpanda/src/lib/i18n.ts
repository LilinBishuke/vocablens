/**
 * 表示言語（UIの言語）辞書。
 * - display_lang: "ja" | "en" | "zh"（user_settings.display_lang）
 * - クライアント: useSettings().display_lang + t(dict, lang)
 * - サーバー: getT(lang)
 * 学習コンテンツ（単語の訳・解説）は対象外（翻訳言語/学習言語の管轄）。
 */

export type DisplayLang = "ja" | "en" | "zh";

const DICT = {
  // 共通
  "tab.home": { ja: "ホーム", en: "Home", zh: "首页" },
  "tab.cards": { ja: "カード", en: "Cards", zh: "卡片" },
  "tab.review": { ja: "復習", en: "Review", zh: "复习" },
  "tab.settings": { ja: "設定", en: "Settings", zh: "设置" },
  "common.close": { ja: "閉じる", en: "Close", zh: "关闭" },
  "common.done": { ja: "完了", en: "Done", zh: "完成" },
  "common.back": { ja: "戻る", en: "Back", zh: "返回" },
  "common.skip": { ja: "スキップ", en: "Skip", zh: "跳过" },
  "common.retry": { ja: "再試行する", en: "Retry", zh: "重试" },
  "common.backHome": { ja: "ホームに戻る", en: "Back to Home", zh: "返回首页" },
  "common.cardsUnit": { ja: "枚", en: "", zh: "张" },

  // ホーム
  "home.learned": { ja: "覚えた", en: "Learned", zh: "已掌握" },
  "home.accuracy": { ja: "正解率", en: "Accuracy", zh: "正确率" },
  "home.cards": { ja: "カード", en: "Cards", zh: "卡片" },
  "home.todayReview": { ja: "今日の復習", en: "Today's Review", zh: "今日复习" },
  "home.startReview": { ja: "復習を始める", en: "Start Review", zh: "开始复习" },
  "home.recentWords": { ja: "最近追加した単語", en: "Recently Added", zh: "最近添加的单词" },
  "home.noWords": { ja: "まだ単語がありません", en: "No words yet", zh: "还没有单词" },
  "home.puzzle": { ja: "パズル", en: "Puzzle", zh: "拼图" },
  "home.justNow": { ja: "たった今", en: "just now", zh: "刚刚" },
  "home.minAgo": { ja: "分前", en: "m ago", zh: "分钟前" },
  "home.hourAgo": { ja: "時間前", en: "h ago", zh: "小时前" },
  "home.dayAgo": { ja: "日前", en: "d ago", zh: "天前" },
  "home.monthAgo": { ja: "ヶ月前", en: "mo ago", zh: "个月前" },
  "home.yearAgo": { ja: "年前", en: "y ago", zh: "年前" },
  "home.addWord": { ja: "単語を追加", en: "Add Word", zh: "添加单词" },

  // カード一覧
  "cards.title": { ja: "カード一覧", en: "All Cards", zh: "卡片列表" },
  "cards.search": { ja: "単語を検索...", en: "Search words...", zh: "搜索单词..." },
  "cards.all": { ja: "全て", en: "All", zh: "全部" },
  "cards.groups": { ja: "グループ", en: "Groups", zh: "分组" },
  "cards.due": { ja: "復習待ち", en: "Due", zh: "待复习" },
  "cards.learned": { ja: "覚えた", en: "Learned", zh: "已掌握" },
  "cards.empty": { ja: "カードがありません", en: "No cards", zh: "没有卡片" },
  "cards.nextToday": { ja: "次: 今日", en: "Due today", zh: "今天复习" },
  "cards.nextTomorrow": { ja: "次: 明日", en: "Due tomorrow", zh: "明天复习" },
  "cards.nextDays": { ja: "次: {n}日後", en: "Due in {n}d", zh: "{n}天后复习" },
  "cards.myFolders": { ja: "マイフォルダ", en: "My Folders", zh: "我的文件夹" },
  "cards.fromSources": { ja: "出典から（自動）", en: "By Source (auto)", zh: "按来源（自动）" },
  "cards.newFolder": { ja: "新しいフォルダ", en: "New Folder", zh: "新建文件夹" },
  "cards.folderName": { ja: "フォルダ名", en: "Folder name", zh: "文件夹名称" },
  "cards.create": { ja: "作成", en: "Create", zh: "创建" },

  // 復習
  "review.card": { ja: "カード", en: "Card", zh: "卡片" },
  "review.writing": { ja: "ライティング", en: "Writing", zh: "写作" },
  "review.tapToReveal": { ja: "タップして答えを見る", en: "Tap to reveal", zh: "点击查看答案" },
  "review.remembered": { ja: "覚えていましたか？", en: "Did you remember?", zh: "记住了吗？" },
  "review.etymology": { ja: "語源", en: "Etymology", zh: "词源" },
  "review.grammar": { ja: "文法・使い方", en: "Grammar & Usage", zh: "语法・用法" },
  "review.slang": { ja: "スラング・口語", en: "Slang & Colloquial", zh: "俚语・口语" },
  "review.examples": { ja: "例文", en: "Examples", zh: "例句" },
  "review.noCards": { ja: "復習する単語がありません", en: "Nothing to review", zh: "没有需要复习的单词" },
  "review.comeBack": { ja: "新しい単語を追加するか、明日また来てください", en: "Add new words or come back tomorrow", zh: "添加新单词，或明天再来" },
  "review.finished": { ja: "お疲れ様！", en: "Well done!", zh: "辛苦了！" },
  "review.reviewedN": { ja: "{n}枚復習しました", en: "Reviewed {n} cards", zh: "复习了{n}张卡片" },
  "review.count": { ja: "復習数", en: "Reviewed", zh: "复习数" },
  "review.again": { ja: "もう一度復習する", en: "Review Again", zh: "再复习一次" },

  // 設定
  "settings.title": { ja: "設定", en: "Settings", zh: "设置" },
  "settings.study": { ja: "学習", en: "Study", zh: "学习" },
  "settings.dailyLimit": { ja: "1日の上限", en: "Daily Limit", zh: "每日上限" },
  "settings.newCards": { ja: "新規カード", en: "New Cards", zh: "新卡片" },
  "settings.reminder": { ja: "リマインダー", en: "Reminder", zh: "提醒" },
  "settings.autoAudio": { ja: "音声自動再生", en: "Auto-play Audio", zh: "自动播放发音" },
  "settings.display": { ja: "表示", en: "Display", zh: "显示" },
  "settings.displayLang": { ja: "表示言語", en: "Language", zh: "显示语言" },
  "settings.showLevel": { ja: "難易度の表示", en: "Show Difficulty", zh: "显示难度" },
  "settings.theme": { ja: "テーマ", en: "Theme", zh: "主题" },
  "settings.themeSystem": { ja: "システム", en: "System", zh: "跟随系统" },
  "settings.themeLight": { ja: "ライト", en: "Light", zh: "浅色" },
  "settings.themeDark": { ja: "ダーク", en: "Dark", zh: "深色" },
  "settings.translationLang": { ja: "翻訳言語", en: "Translation Language", zh: "翻译语言" },
  "settings.levelSystem": { ja: "レベル表記", en: "Level Scale", zh: "等级表示" },
  "settings.integration": { ja: "連携・データ", en: "Integrations & Data", zh: "关联・数据" },
  "settings.bulkEnrich": { ja: "不足情報をAIで一括取得", en: "AI-fill Missing Info", zh: "AI批量补全信息" },
  "settings.export": { ja: "エクスポート（CSV）", en: "Export (CSV)", zh: "导出（CSV）" },
  "settings.other": { ja: "その他", en: "Other", zh: "其他" },
  "settings.version": { ja: "バージョン情報", en: "Version", zh: "版本信息" },
  "settings.logout": { ja: "ログアウト", en: "Log out", zh: "退出登录" },

  // サマリー
  "summary.title": { ja: "学習サマリー", en: "Learning Summary", zh: "学习总结" },
  "summary.streakSuffix": { ja: "日連続で学習中", en: "day streak", zh: "天连续学习" },
  "summary.keepGoing": { ja: "この調子で続けましょう", en: "Keep it up!", zh: "继续保持！" },
  "summary.startToday": { ja: "今日の復習からストリークを始めましょう", en: "Start your streak with today's review", zh: "从今天的复习开始连续记录吧" },
  "summary.thisWeek": { ja: "今週の復習", en: "This Week", zh: "本周复习" },
  "summary.levelDist": { ja: "難易度の内訳", en: "By Difficulty", zh: "难度分布" },
  "summary.topSources": { ja: "よく学んでいる出典", en: "Top Sources", zh: "常学来源" },

  // 詳細
  "detail.meaning": { ja: "意味", en: "Meaning", zh: "释义" },
  "detail.synonyms": { ja: "類語", en: "Synonyms", zh: "近义词" },
  "detail.record": { ja: "学習記録", en: "Study Record", zh: "学习记录" },
  "detail.addedOn": { ja: "追加日", en: "Added", zh: "添加日期" },
  "detail.reviews": { ja: "復習回数", en: "Reviews", zh: "复习次数" },
  "detail.nextReview": { ja: "次の復習", en: "Next Review", zh: "下次复习" },
  "detail.today": { ja: "今日", en: "Today", zh: "今天" },
  "detail.tomorrow": { ja: "明日", en: "Tomorrow", zh: "明天" },
  "detail.daysLater": { ja: "{n}日後", en: "in {n}d", zh: "{n}天后" },
  "detail.addToFolder": { ja: "フォルダに追加", en: "Add to Folder", zh: "添加到文件夹" },
  "detail.delete": { ja: "カードを削除", en: "Delete Card", zh: "删除卡片" },
  "detail.generating": { ja: "AIが語源・文法・例文を生成しています...", en: "AI is generating etymology, grammar & examples...", zh: "AI正在生成词源・语法・例句..." },
} as const;

export type DictKey = keyof typeof DICT;

export function t(key: DictKey, lang: DisplayLang, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s: string = entry?.[lang] ?? entry?.ja ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}

export function getT(lang: DisplayLang) {
  return (key: DictKey, vars?: Record<string, string | number>) => t(key, lang, vars);
}

export function normalizeLang(v: unknown): DisplayLang {
  return v === "en" || v === "zh" ? v : "ja";
}
