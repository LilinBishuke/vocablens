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
  "cards.typeVocab": { ja: "単語", en: "Words", zh: "单词" },
  "cards.typeIdiom": { ja: "イディオム", en: "Idioms", zh: "习语" },
  "cards.typeSlang": { ja: "スラング", en: "Slang", zh: "俚语" },
  "home.addType": { ja: "種類", en: "Type", zh: "类型" },
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
  "settings.learningLang": { ja: "学習言語", en: "Learning Language", zh: "学习语言" },
  "common.langEn": { ja: "英語", en: "English", zh: "英语" },
  "common.langJa": { ja: "日本語", en: "Japanese", zh: "日语" },
  "add.placeholderEn": { ja: "英単語を入力", en: "Enter an English word", zh: "输入英文单词" },
  "add.placeholderJa": { ja: "日本語の単語を入力", en: "Enter a Japanese word", zh: "输入日语单词" },
  "add.invalidEn": { ja: "英単語を入力してください", en: "Please enter an English word", zh: "请输入英文单词" },
  "add.invalidJa": { ja: "日本語の単語を入力してください", en: "Please enter a Japanese word", zh: "请输入日语单词" },
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
  "detail.antonyms": { ja: "反対語", en: "Antonyms", zh: "反义词" },
  "detail.memo": { ja: "メモ", en: "Notes", zh: "笔记" },
  "detail.memoPlaceholder": {
    ja: "覚え方のコツ、間違えやすい点などをメモ...",
    en: "Add notes: mnemonics, common mistakes...",
    zh: "记录记忆技巧、易错点等...",
  },
  "detail.memoSaved": { ja: "保存しました", en: "Saved", zh: "已保存" },
  "detail.memoError": { ja: "保存に失敗しました", en: "Failed to save", zh: "保存失败" },
  "detail.enrichFailed": {
    ja: "情報の生成に失敗しました。時間をおいて再度開いてください",
    en: "Failed to generate info. Please reopen later.",
    zh: "信息生成失败，请稍后重新打开",
  },
  "detail.networkError": { ja: "通信エラーが発生しました", en: "A network error occurred", zh: "发生网络错误" },
  "detail.aiNotConfigured": {
    ja: "AI取得が未設定のため、一部の情報を表示できません",
    en: "AI is not configured; some info is unavailable",
    zh: "未配置AI，部分信息无法显示",
  },
  "detail.deleteConfirm": { ja: "このカードを削除しますか？", en: "Delete this card?", zh: "要删除这张卡片吗？" },
  "detail.deleteFailed": {
    ja: "削除に失敗しました。もう一度お試しください。",
    en: "Failed to delete. Please try again.",
    zh: "删除失败，请重试。",
  },
  "detail.webpage": { ja: "Webページ", en: "Web page", zh: "网页" },

  // 共通2
  "common.learned": { ja: "覚えた", en: "Learned", zh: "已记住" },
  "common.itemsUnit": { ja: "件", en: "", zh: "个" },
  "common.settings": { ja: "設定", en: "Settings", zh: "设置" },
  "common.dbUpdateError": {
    ja: "保存できませんでした。データベースの更新（SQL実行）が必要な可能性があります",
    en: "Could not save. The database may need a schema update (SQL).",
    zh: "无法保存。数据库可能需要更新（执行SQL）",
  },

  // フェイス評価
  "rate.q0": { ja: "全然", en: "No idea", zh: "完全不会" },
  "rate.q2": { ja: "忘れた", en: "Forgot", zh: "忘了" },
  "rate.q3": { ja: "ぎりぎり", en: "Barely", zh: "勉强" },
  "rate.q4": { ja: "できた", en: "Got it", zh: "记得" },
  "rate.q5": { ja: "余裕", en: "Easy", zh: "轻松" },

  // レベルラベル
  "level.1": { ja: "初級", en: "Beginner", zh: "初级" },
  "level.2": { ja: "初中級", en: "Lower-Int", zh: "中低级" },
  "level.3": { ja: "中級", en: "Intermediate", zh: "中级" },
  "level.4": { ja: "中上級", en: "Upper-Int", zh: "中高级" },
  "level.5": { ja: "上級", en: "Advanced", zh: "高级" },

  // ライティングモード
  "writing.placeholder": { ja: "単語を入力...", en: "Type the word...", zh: "输入单词..." },
  "writing.charsUnit": { ja: "文字", en: " letters", zh: "个字" },
  "writing.hintLabel": { ja: "ヒント", en: "Hint", zh: "提示" },
  "writing.showHint": {
    ja: "ヒントを見る（最初の2文字）",
    en: "Show hint (first 2 letters)",
    zh: "查看提示（前2个字）",
  },
  "writing.correct": { ja: "✓ 正解！", en: "✓ Correct!", zh: "✓ 正确！" },
  "writing.incorrect": { ja: "✗ 不正解", en: "✗ Incorrect", zh: "✗ 不正确" },
  "writing.answer": { ja: "正解", en: "Answer", zh: "正确答案" },
  "writing.next": { ja: "次へ", en: "Next", zh: "下一个" },
  "writing.submit": { ja: "回答する", en: "Submit", zh: "提交" },

  // 復習完了
  "complete.title": { ja: "お疲れ様！", en: "Well done!", zh: "辛苦了！" },
  "complete.puzzleDone": { ja: "パズル完成！", en: "Puzzle complete!", zh: "拼图完成！" },
  "complete.puzzleDoneDesc": {
    ja: "「{name}」をコンプリートしました！",
    en: "You completed \"{name}\"!",
    zh: "完成了「{name}」！",
  },
  "complete.newPiece": {
    ja: "新しいピースが開放されました！",
    en: "A new piece was unlocked!",
    zh: "解锁了新的拼图块！",
  },
  "complete.reviewedCount": {
    ja: "{n}枚復習しました",
    en: "You reviewed {n} cards",
    zh: "复习了{n}张卡片",
  },
  "complete.reviews": { ja: "復習数", en: "Reviews", zh: "复习数" },
  "complete.again": { ja: "もう一度復習する", en: "Review again", zh: "再复习一次" },

  // 設定（選択肢・ステータス）
  "settings.perDayUnit": { ja: "枚/日", en: "/day", zh: "张/日" },
  "settings.scale3": { ja: "3段階", en: "3 levels", zh: "3级" },
  "settings.scale5": { ja: "5段階", en: "5 levels", zh: "5级" },
  "settings.bulkChecking": { ja: "対象を確認中...", en: "Checking targets...", zh: "正在确认对象..." },
  "settings.bulkDone": { ja: "すべて取得済みです", en: "Everything is up to date", zh: "全部已获取" },
  "settings.bulkNotConfigured": { ja: "AI取得が未設定です", en: "AI is not configured", zh: "未配置AI" },
  "settings.bulkProgress": { ja: "生成中 {done}/{total}...", en: "Generating {done}/{total}...", zh: "生成中 {done}/{total}..." },
  "settings.importing": { ja: "読み込み中...", en: "Importing...", zh: "导入中..." },
  "settings.importError": {
    ja: "ファイルの読み込みに失敗しました",
    en: "Failed to read the file",
    zh: "文件读取失败",
  },
  "settings.exportEmpty": {
    ja: "エクスポートするカードがありません",
    en: "No cards to export",
    zh: "没有可导出的卡片",
  },
  "settings.tokenCopied": { ja: "トークンをコピーしました", en: "Token copied", zh: "已复制令牌" },
  "settings.bulkComplete": { ja: "完了（{n}枚）", en: "Done ({n} cards)", zh: "完成（{n}张）" },
  "settings.importErrorDetail": { ja: "エラー: {msg}", en: "Error: {msg}", zh: "错误: {msg}" },
  "settings.importDone": {
    ja: "✓ {imported}件インポート（{skipped}件スキップ）",
    en: "✓ Imported {imported} (skipped {skipped})",
    zh: "✓ 已导入{imported}条（跳过{skipped}条）",
  },
  "add.adding": { ja: "追加中...", en: "Adding...", zh: "添加中..." },
  "add.addToCards": { ja: "カードに追加", en: "Add to cards", zh: "添加到卡片" },
  "settings.copied": { ja: "コピー済み ✓", en: "Copied ✓", zh: "已复制 ✓" },

  // グループ
  "groups.other": { ja: "その他", en: "Other", zh: "其他" },
  "groups.manual": { ja: "手動で追加", en: "Added manually", zh: "手动添加" },
  "groups.due": { ja: "復習待ち", en: "due", zh: "待复习" },
  "groups.reviewThis": {
    ja: "このグループを復習する（{n}枚）",
    en: "Review this group ({n})",
    zh: "复习此分组（{n}张）",
  },
  "groups.empty": {
    ja: "このグループにはまだカードがありません",
    en: "No cards in this group yet",
    zh: "此分组还没有卡片",
  },
  "groups.next": { ja: "次", en: "Next", zh: "下次" },
  "groups.folderPending": {
    ja: "フォルダ機能の準備中です（データベース更新待ち）",
    en: "Folders are being set up (waiting for a database update)",
    zh: "文件夹功能准备中（等待数据库更新）",
  },

  // パズル
  "puzzle.select": { ja: "パズルを選ぶ", en: "Choose a puzzle", zh: "选择拼图" },
  "puzzle.keepGoing": {
    ja: "復習を続けてパズルを完成させよう！",
    en: "Keep reviewing to complete the puzzle!",
    zh: "继续复习来完成拼图吧！",
  },
  "puzzle.rule": {
    ja: "1セッション完了 = 1ピース開放",
    en: "1 session = 1 piece unlocked",
    zh: "完成1次复习 = 解锁1块",
  },
  "puzzle.inProgress": { ja: "進行中", en: "In progress", zh: "进行中" },
  "puzzle.pieces": { ja: "ピース", en: "pieces", zh: "块" },
  "puzzle.none": { ja: "パズルがまだありません", en: "No puzzles yet", zh: "还没有拼图" },
  "puzzle.revealed": { ja: "開放済み", en: "Unlocked", zh: "已解锁" },
  "puzzle.locked": { ja: "未開放", en: "Locked", zh: "未解锁" },
  "puzzle.change": { ja: "パズルを変更", en: "Change puzzle", zh: "更换拼图" },
  "puzzle.piecesRevealed": { ja: "ピース開放", en: "pieces unlocked", zh: "块已解锁" },
  "puzzle.remaining": {
    ja: "あと{n}セッションで完成！",
    en: "{n} more sessions to complete!",
    zh: "再复习{n}次即可完成！",
  },

  // フォルダ
  "folder.name": { ja: "フォルダ名", en: "Folder name", zh: "文件夹名" },
  "folder.create": { ja: "作成", en: "Create", zh: "创建" },
  "folder.createNew": { ja: "新しいフォルダを作成", en: "Create a new folder", zh: "新建文件夹" },

  // エラー
  "error.title": { ja: "問題が発生しました", en: "Something went wrong", zh: "发生了问题" },
  "error.desc": {
    ja: "一時的なエラーの可能性があります。もう一度お試しください。",
    en: "This may be a temporary error. Please try again.",
    zh: "可能是暂时性错误，请重试。",
  },

  // 単語追加
  "add.autoFetch": {
    ja: "意味と発音は自動で取得されます",
    en: "Meaning and pronunciation are fetched automatically",
    zh: "释义和发音会自动获取",
  },
  "add.searching": { ja: "検索中...", en: "Searching...", zh: "搜索中..." },
  "add.generating": {
    ja: "AIが意味・語源・例文を生成しています...",
    en: "AI is generating meaning, etymology, examples...",
    zh: "AI正在生成释义・词源・例句...",
  },
  "add.added": { ja: "「{word}」を追加しました", en: "Added \"{word}\"", zh: "已添加「{word}」" },
  "add.notFound": {
    ja: "見つかりませんでした。スペルを確認してください",
    en: "Not found. Please check the spelling.",
    zh: "未找到，请检查拼写",
  },
  "add.searchFailed": {
    ja: "検索に失敗しました。通信環境を確認してください",
    en: "Search failed. Please check your connection.",
    zh: "搜索失败，请检查网络",
  },
  "add.loginRequired": { ja: "ログインが必要です", en: "Please log in", zh: "请先登录" },
  "add.saveFailed": {
    ja: "保存に失敗しました。もう一度お試しください",
    en: "Failed to save. Please try again.",
    zh: "保存失败，请重试",
  },

  // aria
  "aria.speak": { ja: "発音を再生", en: "Play pronunciation", zh: "播放发音" },
  "aria.reveal": { ja: "タップして答えを見る", en: "Tap to reveal the answer", zh: "点按查看答案" },
  "aria.addWord": { ja: "単語を追加", en: "Add a word", zh: "添加单词" },
  "aria.viewSummary": { ja: "学習サマリーを見る", en: "View study summary", zh: "查看学习摘要" },

  // サマリー（曜日はカンマ区切りで保持）
  "summary.dowList": { ja: "日,月,火,水,木,金,土", en: "S,M,T,W,T,F,S", zh: "日,一,二,三,四,五,六" },
  "detail.conjugations": { ja: "変化形", en: "Word Forms", zh: "词形变化" },
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
