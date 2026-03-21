export const supportedLocales = ["zh-CN", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "zh-CN";
export const localeCookieName = "auto-x-to-wechat.locale";

type Messages = {
  metadata: {
    description: string;
  };
  shell: {
    subtitle: string;
    badge: string;
    nav: {
      overview: string;
      dashboard: string;
      bindings: string;
      strategies: string;
      reports: string;
      ai: string;
      taxonomy: string;
      archives: string;
      runs: string;
    };
    localeLabel: string;
    localeOptions: {
      "zh-CN": string;
      en: string;
    };
    themeLabel: string;
    themeLight: string;
    themeDark: string;
  };
  common: {
    notRecorded: string;
    notScheduled: string;
    noDisplayName: string;
    noMedia: string;
    startDate: string;
    untilNow: string;
    openOriginal: string;
    backToList: string;
    viewDetails: string;
    openMedia: string;
    noTargetAuthor: string;
    mediaItem: string;
    unknownSize: string;
    seconds: string;
    createdAt: string;
    finishedAt: string;
    archiveAt: string;
    runId: string;
    postCountLabel: string;
    runCountLabel: string;
    xPostId: string;
    errorDetail: string;
  };
  pagination: {
    pageSummary: string;
    totalRecords: string;
    previous: string;
    next: string;
    reachedEnd: string;
  };
  home: {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    actions: {
      dashboard: string;
      bindings: string;
    };
    setupCards: Array<{
      title: string;
      description: string;
    }>;
    progress: {
      badge: string;
      title: string;
      description: string;
      milestones: string[];
    };
    nextStep: {
      title: string;
      description: string;
      action: string;
    };
  };
  login: {
    heroBadge: string;
    heroTitle: string;
    heroDescription: string;
    accountTitle: string;
    accountEmail: string;
    accountPassword: string;
    accountHint: string;
    loadingTitle: string;
    loadingDescription: string;
    formTitle: string;
    emailLabel: string;
    passwordLabel: string;
    sessionHint: string;
    submit: string;
    submitting: string;
  };
  dashboard: {
    eyebrow: string;
    title: string;
    description: string;
    manageBindings: string;
    signOut: string;
    errorTitle: string;
    errorAction: string;
    stats: {
      bindingStatus: string;
      nextRun: string;
      archiveCount: string;
      latestRunStatus: string;
    };
    bindingSummary: {
      title: string;
      description: string;
      boundAccount: string;
      crawlConfig: string;
      crawlEnabled: string;
      crawlDisabled: string;
      interval: string;
      lastCrawl: string;
      nextRun: string;
      latestError: string;
      healthyTitle: string;
      healthyDescription: string;
      emptyTitle: string;
      emptyDescription: string;
      emptyAction: string;
    };
    latestRun: {
      title: string;
      description: string;
      startedAt: string;
      finishedAt: string;
      fetched: string;
      archived: string;
      skipped: string;
      failed: string;
      errorSummary: string;
      viewAll: string;
      emptyTitle: string;
      emptyDescription: string;
      emptyAction: string;
    };
    failures: {
      title: string;
      description: string;
      failedRuns: string;
      failedPosts: string;
      failedPostsInline: string;
      noErrorSummary: string;
      emptyTitle: string;
      emptyDescription: string;
      viewRun: string;
    };
  };
  bindings: {
    eyebrow: string;
    title: string;
    description: string;
    accountListTitle: string;
    accountListDescription: string;
    accountCount: string;
    statusTitle: string;
    statusDescription: string;
    credentialSource: string;
    lastValidatedAt: string;
    nextCrawlAt: string;
    crawlEnabled: string;
    crawlDisabled: string;
    crawlInterval: string;
    latestError: string;
    emptyTitle: string;
    emptyDescription: string;
    profilesTitle: string;
    profilesDescription: string;
    profileRunSummary: string;
    lastRunLabel: string;
    nextRunLabel: string;
    profileModeLabel: string;
    maxPostsLabel: string;
    queryTextLabel: string;
    queryTextPlaceholder: string;
    profileEnabledLabel: string;
    profileEnabledHint: string;
    saveProfile: string;
    savingProfile: string;
    triggerProfileNow: string;
    addProfileTitle: string;
    addProfileDescription: string;
    addProfile: string;
    addingProfile: string;
    emptyProfilesTitle: string;
    emptyProfilesDescription: string;
    crawlConfigTitle: string;
    crawlConfigDescription: string;
    autoCrawlTitle: string;
    autoCrawlDescription: string;
    crawlIntervalLabel: string;
    saveConfig: string;
    savingConfig: string;
    operationsTitle: string;
    operationsDescription: string;
    triggerNow: string;
    triggeringNow: string;
    revalidate: string;
    revalidating: string;
    disable: string;
    disabling: string;
    unbindWarning: string;
    unbind: string;
    unbinding: string;
    browserAssistTitle: string;
    browserAssistDescription: string;
    browserAssistDescriptionBound: string;
    browserFlowTitle: string;
    browserFlowDescription: string;
    browserStep1: string;
    browserStep2: string;
    browserStep3: string;
    sessionId: string;
    sessionExpiresAt: string;
    fillingUserId: string;
    browserSuccess: string;
    startBrowserBinding: string;
    startBrowserBindingAgain: string;
    startingBrowserBinding: string;
    cancelBrowserBinding: string;
    refreshBindingState: string;
    browserRemoteDesktopNotice: string;
    openBrowserDesktop: string;
    advancedTitle: string;
    advancedDescription: string;
    xUserId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    credentialSourceLabel: string;
    credentialPayload: string;
    credentialPayloadHint: string;
    enableAutoCrawlAfterSave: string;
    enableAutoCrawlAfterSaveHint: string;
    submit: string;
    submitting: string;
    update: string;
    browserSessionRestoreFailed: string;
    browserSessionPollingFailed: string;
    browserSessionStartFailed: string;
    browserSessionCancelFailed: string;
    browserSessionRequestFailed: string;
    unbindConfirm: string;
    placeholders: {
      xUserId: string;
      username: string;
      displayName: string;
      credentialPayload: string;
    };
  };
  strategies: {
    eyebrow: string;
    title: string;
    description: string;
    accountListTitle: string;
    accountListDescription: string;
    accountCount: string;
    workspaceTitle: string;
    workspaceDescription: string;
    selectedAccount: string;
    selectedAccountHint: string;
    emptyTitle: string;
    emptyDescription: string;
    noAccountTitle: string;
    noAccountDescription: string;
    openBindings: string;
    createStrategy: string;
    createStrategyForAccount: string;
    editStrategy: string;
    systemDefaultBadge: string;
    deleteStrategy: string;
    deletingStrategy: string;
    deleteStrategyConfirm: string;
    saveStrategy: string;
    savingStrategy: string;
    createStrategyDescription: string;
    editStrategyDescription: string;
    strategyCountLabel: string;
    strategyCount: string;
    enabledStrategyLabel: string;
    enabledStrategyCount: string;
    nextRunSummary: string;
    modeLabel: string;
    scheduleLabel: string;
    lastRunLabel: string;
    nextRunLabel: string;
    maxPostsLabel: string;
    queryTextLabel: string;
    queryTextPlaceholder: string;
    strategyEnabledLabel: string;
    strategyEnabledHint: string;
    triggerNow: string;
    triggeringNow: string;
    emptyStrategiesTitle: string;
    emptyStrategiesDescription: string;
    viewBindingWorkspace: string;
    modeReadonlyHint: string;
    form: {
      modeLabel: string;
      accountLabel: string;
      accountSummary: string;
      createHint: string;
      editHint: string;
    };
    scheduleBuilder: {
      customCronHint: string;
      customCronLabel: string;
      dailyTimeLabel: string;
      hourlyEveryHoursLabel: string;
      hourlyMinuteLabel: string;
      intervalMinutesLabel: string;
      schedulePresetCustom: string;
      schedulePresetDaily: string;
      schedulePresetHourly: string;
      schedulePresetInterval: string;
      schedulePresetLabel: string;
      schedulePresetWeekly: string;
      schedulePreviewLabel: string;
      scheduleSummaryCustom: string;
      scheduleSummaryDaily: string;
      scheduleSummaryHourly: string;
      scheduleSummaryInterval: string;
      scheduleSummaryWeekly: string;
      weeklyDaysLabel: string;
      weeklyTimeLabel: string;
      weekdays: Record<
        "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
        string
      >;
    };
  };
  taxonomy: {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    errorTitle: string;
    errorDescription: string;
    categoriesTitle: string;
    categoriesDescription: string;
    tagsTitle: string;
    tagsDescription: string;
    createCategory: string;
    createCategoryDescription: string;
    editCategory: string;
    editCategoryDescription: string;
    saveCategory: string;
    createTag: string;
    createTagDescription: string;
    editTag: string;
    editTagDescription: string;
    saveTag: string;
    saving: string;
    cancel: string;
    edit: string;
    disable: string;
    disableCategoryConfirm: string;
    disableTagConfirm: string;
    statusActive: string;
    statusInactive: string;
    systemBadge: string;
    customBadge: string;
    noColor: string;
    noCategoryDescription: string;
    emptyCategories: string;
    emptyTags: string;
    summary: {
      totalCategories: string;
      activeCategories: string;
      totalTags: string;
      activeTags: string;
    };
    form: {
      nameLabel: string;
      slugLabel: string;
      descriptionLabel: string;
      colorLabel: string;
      sortOrderLabel: string;
      statusLabel: string;
      categoryNamePlaceholder: string;
      categoryDescriptionPlaceholder: string;
      tagNamePlaceholder: string;
      slugPlaceholder: string;
      colorPlaceholder: string;
    };
  };
  ai: {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    errorTitle: string;
    errorDescription: string;
    summary: {
      providerCount: string;
      enabledProviders: string;
      modelCount: string;
      defaultTasks: string;
      totalCalls: string;
      successRate: string;
      totalTokens: string;
      totalCost: string;
    };
    usageTitle: string;
    usageDescription: string;
    usageErrorDescription: string;
    usageEmptyTitle: string;
    usageEmptyDescription: string;
    windowLimitTitle: string;
    windowLimitDescription: string;
    windowRemainingDescription: string;
    dailyBudgetTitle: string;
    dailyBudgetDescription: string;
    dailyBudgetRemainingDescription: string;
    taskBreakdownTitle: string;
    providerBreakdownTitle: string;
    breakdownMeta: string;
    breakdownEmpty: string;
    auditTitle: string;
    auditDescription: string;
    auditEmptyTitle: string;
    auditEmptyDescription: string;
    auditNoProvider: string;
    auditNoModel: string;
    auditTaskHeader: string;
    auditModelHeader: string;
    auditTargetLabel: string;
    auditUsageHeader: string;
    auditTimeHeader: string;
    auditErrorHeader: string;
    auditTokensLabel: string;
    auditCostLabel: string;
    rateLimitedBadge: string;
    providersTitle: string;
    providersDescription: string;
    createProvider: string;
    editProvider: string;
    createProviderDescription: string;
    editProviderDescription: string;
    saveProvider: string;
    createModel: string;
    editModel: string;
    createModelDescription: string;
    editModelDescription: string;
    saveModel: string;
    testingProvider: string;
    testProvider: string;
    testWithDefaultModel: string;
    testRequiresModel: string;
    setAsDefault: string;
    defaultBadge: string;
    enabledBadge: string;
    disabledBadge: string;
    noBaseUrl: string;
    noParameters: string;
    providersEmptyTitle: string;
    providersEmptyDescription: string;
    modelsTitle: string;
    modelsDescription: string;
    modelsEmptyTitle: string;
    modelsEmptyDescription: string;
    providerTypeLabel: string;
    baseUrlLabel: string;
    apiKeyLabel: string;
    apiKeyHint: string;
    providerNameLabel: string;
    modelCodeLabel: string;
    modelDisplayNameLabel: string;
    inputTokenPriceLabel: string;
    outputTokenPriceLabel: string;
    tokenPriceHint: string;
    tokenPriceValue: string;
    noTokenPrice: string;
    taskTypeLabel: string;
    parametersLabel: string;
    parametersHint: string;
    enabledLabel: string;
    defaultLabel: string;
    hasApiKey: string;
    missingApiKey: string;
    modelCountLabel: string;
    edit: string;
    form: {
      providerNamePlaceholder: string;
      baseUrlPlaceholder: string;
      apiKeyPlaceholder: string;
      modelCodePlaceholder: string;
      modelDisplayNamePlaceholder: string;
      parametersPlaceholder: string;
      providerSelectPlaceholder: string;
    };
  };
  archives: {
    eyebrow: string;
    title: string;
    description: string;
    filterTitle: string;
    filterDescription: string;
    keywordPlaceholder: string;
    allTypes: string;
    applyFilters: string;
    clearFilters: string;
    keywordBadge: string;
    typeBadge: string;
    dateBadge: string;
    errorTitle: string;
    errorAction: string;
    emptyFilteredTitle: string;
    emptyFilteredDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredAction: string;
    emptyAction: string;
    sourceBinding: string;
    sourceCreatedAt: string;
    media: string;
    archiveId: string;
    mediaIncluded: string;
    textOnly: string;
  };
  archiveDetail: {
    eyebrow: string;
    titleFallback: string;
    descriptionReady: string;
    descriptionLoading: string;
    openOriginal: string;
    errorTitle: string;
    errorAction: string;
    archivedAt: string;
    sourceBinding: string;
    sourceCreatedAt: string;
    metrics: {
      replies: string;
      reposts: string;
      quotes: string;
      likesViews: string;
    };
    sourceContextTitle: string;
    sourceContextDescription: string;
    originalPost: string;
    binding: string;
    firstRun: string;
    viewRun: string;
    mediaTitle: string;
    mediaDescription: string;
    mediaInlineHint: string;
    noMediaTitle: string;
    noMediaDescription: string;
    openRelatedPost: string;
    targetAuthor: string;
    taxonomyTitle: string;
    taxonomyDescription: string;
    currentCategoryLabel: string;
    currentTagsLabel: string;
    noPrimaryCategory: string;
    noTags: string;
    primaryCategoryLabel: string;
    chooseCategory: string;
    tagsFieldLabel: string;
    chooseTags: string;
    tagPickerHint: string;
    selectedTagsCount: string;
    searchTagsPlaceholder: string;
    noMatchingTags: string;
    taxonomyEditorHint: string;
    lockBadge: string;
    noTagOptions: string;
    taxonomyLockHint: string;
    taxonomyLoadError: string;
    saveTaxonomy: string;
    saveTaxonomyPending: string;
  };
  runs: {
    eyebrow: string;
    title: string;
    description: string;
    errorTitle: string;
    errorAction: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    createdAt: string;
    bindingAccount: string;
    startedAt: string;
    finishedAt: string;
    fetched: string;
    newCount: string;
    skipped: string;
    failed: string;
    errorSummary: string;
    noErrorSummary: string;
    backToBindings: string;
  };
  reports: {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    generateTitle: string;
    generateDescription: string;
    generateBadge: string;
    generateAction: string;
    generating: string;
    filterTitle: string;
    filterDescription: string;
    noBindingsHint: string;
    noCategoriesHint: string;
    noTagsHint: string;
    allReportTypes: string;
    allStatuses: string;
    applyFilters: string;
    clearFilters: string;
    errorTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    createdAtLabel: string;
    updatedAtLabel: string;
    periodLabel: string;
    sourcePostsLabel: string;
    reportIdLabel: string;
    summaryLabel: string;
    noSummary: string;
    viewDetail: string;
    form: {
      reportTypeLabel: string;
      statusLabel: string;
      periodStartLabel: string;
      periodEndLabel: string;
      bindingFilterLabel: string;
      modeFilterLabel: string;
      categoryFilterLabel: string;
      tagFilterLabel: string;
    };
  };
  reportDetail: {
    eyebrow: string;
    titleFallback: string;
    descriptionReady: string;
    descriptionLoading: string;
    errorTitle: string;
    errorAction: string;
    periodLabel: string;
    createdAtLabel: string;
    updatedAtLabel: string;
    summaryTitle: string;
    noSummary: string;
    sourcePostsTitle: string;
    sourcePostsDescription: string;
    sourcePostLabel: string;
    viewArchive: string;
    openSourcePost: string;
    emptySourcePostsTitle: string;
    emptySourcePostsDescription: string;
    contextTitle: string;
    contextDescription: string;
    sourcePostsCountLabel: string;
    sourcePostsCount: string;
    editorTitle: string;
    editorDescription: string;
    titleLabel: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    bodyHint: string;
    save: string;
    saving: string;
    regenerateTitle: string;
    regenerateDescription: string;
    regenerate: string;
    regenerating: string;
    publishTitle: string;
    publishDescription: string;
    publishPendingHint: string;
    publishAction: string;
  };
  runDetail: {
    eyebrow: string;
    titleFallback: string;
    title: string;
    descriptionReady: string;
    descriptionLoading: string;
    viewBinding: string;
    errorTitle: string;
    errorAction: string;
    createdAt: string;
    bindingAccount: string;
    startedAt: string;
    finishedAt: string;
    fetched: string;
    archived: string;
    skipped: string;
    failed: string;
    runItemsTitle: string;
    runItemsDescription: string;
    recordTime: string;
    viewArchive: string;
    noArchiveEntity: string;
    emptyTitle: string;
    emptyDescription: string;
    contextTitle: string;
    contextDescription: string;
    binding: string;
    crawlJob: string;
    crawlJobEnabled: string;
    crawlJobDisabled: string;
    nextRun: string;
    errorInfoTitle: string;
    errorInfoDescription: string;
    errorSummary: string;
    noErrorSummary: string;
    noErrorDetail: string;
  };
  enums: {
    bindingStatus: Record<
      "ACTIVE" | "INVALID" | "DISABLED" | "PENDING" | "UNBOUND",
      string
    >;
    runStatus: Record<
      | "QUEUED"
      | "RUNNING"
      | "SUCCESS"
      | "PARTIAL_FAILED"
      | "FAILED"
      | "CANCELLED"
      | "NO_RUN",
      string
    >;
    triggerType: Record<"MANUAL" | "SCHEDULED" | "RETRY", string>;
    crawlMode: Record<"RECOMMENDED" | "HOT" | "SEARCH", string>;
    postType: Record<"POST" | "REPOST" | "QUOTE" | "REPLY", string>;
    credentialSource: Record<
      "WEB_LOGIN" | "COOKIE_IMPORT" | "EXTENSION",
      string
    >;
    browserSessionStatus: Record<
      | "PENDING"
      | "WAITING_LOGIN"
      | "SUCCESS"
      | "FAILED"
      | "EXPIRED"
      | "CANCELLED",
      string
    >;
    actionType: Record<"CREATED" | "SKIPPED" | "FAILED", string>;
    relationType: Record<"QUOTE" | "REPOST" | "REPLY", string>;
    taxonomySource: Record<"MANUAL" | "AI" | "RULE", string>;
    aiProviderType: Record<
      "OPENAI" | "ANTHROPIC" | "GEMINI" | "OPENAI_COMPATIBLE",
      string
    >;
    aiTaskType: Record<
      "POST_CLASSIFY" | "REPORT_SUMMARY" | "DRAFT_REWRITE",
      string
    >;
    aiTaskStatus: Record<
      "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED",
      string
    >;
    reportType: Record<"WEEKLY" | "MONTHLY", string>;
    reportStatus: Record<"DRAFT" | "READY" | "FAILED", string>;
  };
  actions: {
    login: {
      invalidEmail: string;
      invalidPassword: string;
      invalidInput: string;
      invalidCredentials: string;
      failed: string;
    };
    bindings: {
      missingXUserId: string;
      missingUsername: string;
      invalidAvatarUrl: string;
      missingCredentialPayload: string;
      missingCrawlInterval: string;
      invalidCrawlIntervalInt: string;
      invalidCrawlIntervalMin: string;
      invalidCrawlIntervalMax: string;
      missingMaxPosts: string;
      invalidMaxPostsInt: string;
      invalidMaxPostsMin: string;
      invalidMaxPostsMax: string;
      missingBindingId: string;
      missingProfileId: string;
      missingQueryText: string;
      missingScheduleCron: string;
      bindingValidationFailed: string;
      profileValidationFailed: string;
      bindingSaved: string;
      profileCreated: string;
      profileUpdated: string;
      profileDeleted: string;
      configValidationFailed: string;
      configSaved: string;
      bindingRevalidated: string;
      bindingDisabled: string;
      bindingUnbound: string;
      viewCurrentRun: string;
      viewTriggeredRun: string;
      manualCrawlTriggered: string;
      profileManualTriggered: string;
    };
    archives: {
      missingArchiveId: string;
      taxonomyUpdated: string;
      taxonomyValidationFailed: string;
    };
    taxonomy: {
      missingName: string;
      invalidColor: string;
      invalidSortOrder: string;
      missingCategoryId: string;
      missingTagId: string;
      categoryValidationFailed: string;
      categoryCreated: string;
      categoryUpdated: string;
      categoryDisabled: string;
      tagValidationFailed: string;
      tagCreated: string;
      tagUpdated: string;
      tagDisabled: string;
    };
    ai: {
      missingProviderId: string;
      missingProviderName: string;
      missingProviderType: string;
      missingApiKey: string;
      missingModelId: string;
      missingProviderConfigId: string;
      missingModelCode: string;
      missingDisplayName: string;
      missingTaskType: string;
      invalidParametersJson: string;
      invalidTokenPrice: string;
      defaultModelRequiresEnabled: string;
      providerValidationFailed: string;
      providerCreated: string;
      providerUpdated: string;
      modelValidationFailed: string;
      modelCreated: string;
      modelUpdated: string;
      modelDefaultUpdated: string;
      providerTested: string;
    };
    reports: {
      missingReportType: string;
      missingPeriodStart: string;
      missingPeriodEnd: string;
      invalidPeriodRange: string;
      missingReportId: string;
      missingReportTitle: string;
      missingBodyText: string;
      generateValidationFailed: string;
      updateValidationFailed: string;
      regenerateValidationFailed: string;
      reportUpdated: string;
      reportRegenerated: string;
    };
    api: {
      unauthorized: string;
      requestFailed: string;
    };
  };
};

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes((value ?? "") as Locale);
}

export function getIntlLocale(locale: Locale) {
  return locale === "zh-CN" ? "zh-CN" : "en-US";
}

export function formatMessage(
  template: string,
  params: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];

    return value === null || value === undefined ? "" : String(value);
  });
}

const messages: Record<Locale, Messages> = {
  "zh-CN": {
    metadata: {
      description: "X 推荐内容抓取、归档与任务平台",
    },
    shell: {
      subtitle: "真实 X 绑定、推荐流抓取与富文本归档",
      badge: "Browser Binding",
      nav: {
        overview: "概览",
        dashboard: "仪表盘",
        bindings: "绑定",
        strategies: "策略",
        reports: "报告",
        ai: "AI 模型",
        taxonomy: "分类标签",
        archives: "归档",
        runs: "运行记录",
      },
      localeLabel: "语言",
      localeOptions: {
        "zh-CN": "中文",
        en: "EN",
      },
      themeLabel: "主题",
      themeLight: "亮色",
      themeDark: "暗色",
    },
    common: {
      notRecorded: "未记录",
      notScheduled: "未安排",
      noDisplayName: "未填写显示名",
      noMedia: "无媒体",
      startDate: "起始",
      untilNow: "至今",
      openOriginal: "打开原帖",
      backToList: "返回列表",
      viewDetails: "查看详情",
      openMedia: "打开媒体资源",
      noTargetAuthor: "未记录目标作者",
      mediaItem: "媒体",
      unknownSize: "尺寸未知",
      seconds: "秒",
      createdAt: "创建于",
      finishedAt: "结束于",
      archiveAt: "归档于",
      runId: "运行 ID",
      postCountLabel: "条帖子",
      runCountLabel: "次执行",
      xPostId: "帖子 ID",
      errorDetail: "结构化错误详情",
    },
    pagination: {
      pageSummary: "第 {page} / {totalPages} 页",
      totalRecords: "共 {total} 条记录",
      previous: "上一页",
      next: "下一页",
      reachedEnd: "已到底",
    },
    home: {
      eyebrow: "产品概览",
      title: "连接 X 登录态，把推荐内容沉淀为可检索归档",
      description:
        "通过浏览器辅助绑定真实 X 账号，定时抓取首页推荐流，自动去重并以富文本卡片形式沉淀内容，方便后续检索、回查与整理。",
      badge: "Real X Workflow",
      actions: {
        dashboard: "查看仪表盘",
        bindings: "开始绑定账号",
      },
      setupCards: [
        {
          title: "真实账号绑定",
          description:
            "系统拉起可见浏览器进入 X 登录页，你完成登录后，平台会自动回填账号信息与 Cookie。",
        },
        {
          title: "自动抓取与去重",
          description:
            "按设定周期抓取推荐流，记录每次执行结果，并按绑定账号与帖子 ID 去重，避免重复归档。",
        },
        {
          title: "富文本归档展示",
          description:
            "帖子会以富文本形式存档，支持卡片列表分页浏览、详情查看、来源回溯和运行记录联动。",
        },
      ],
      progress: {
        badge: "核心能力",
        title: "一条链路覆盖绑定、抓取、归档与回查",
        description:
          "MVP 聚焦最常用的内容沉淀场景：先绑定真实 X 登录态，再稳定抓取推荐内容，最后把有价值的帖子沉淀成可检索归档。",
        milestones: [
          "浏览器辅助登录并自动回填 Cookie 与账号信息",
          "按绑定账号 + 帖子 ID 去重，避免重复归档",
          "提供抓取记录、错误摘要和归档详情页",
        ],
      },
      nextStep: {
        title: "技术栈",
        description:
          "前端采用 Next.js、ShadCN UI、Tailwind CSS 与 TypeScript，后端采用 NestJS 与 Prisma，数据存储使用 PostgreSQL，认证由 NextAuth.js 负责。",
        action: "支持 Docker 本地部署，以及 Vercel + Neon 的云端组合部署。",
      },
    },
    login: {
      heroBadge: "开发环境认证",
      heroTitle: "登录后才能访问绑定、归档和任务页面",
      heroDescription:
        "当前开发阶段使用平台账号密码登录，并通过 NextAuth + Prisma Adapter 将用户会话持久化到 PostgreSQL。后续再扩展邮箱验证码或 OAuth 登录时，不需要推翻现有受保护路由结构。",
      accountTitle: "开发环境测试账号",
      accountEmail: "邮箱：`demo@example.com`",
      accountPassword: "密码：`demo123456`",
      accountHint: "当前账号由数据库种子脚本自动创建。",
      loadingTitle: "正在准备登录表单",
      loadingDescription: "正在读取登录回跳地址并初始化会话表单。",
      formTitle: "登录平台",
      emailLabel: "邮箱",
      passwordLabel: "密码",
      sessionHint:
        "登录成功后会在 PostgreSQL 中写入 NextAuth 会话，并由服务端读取数据库会话保护页面。",
      submit: "进入系统",
      submitting: "登录中...",
    },
    dashboard: {
      eyebrow: "工作区",
      title: "仪表盘",
      description:
        "这里集中展示当前绑定状态、下一次抓取安排、最近一次执行结果和累计归档规模。",
      manageBindings: "管理绑定",
      signOut: "退出登录",
      errorTitle: "仪表盘暂时不可用",
      errorAction: "先去查看绑定",
      stats: {
        bindingStatus: "绑定状态",
        nextRun: "下一次抓取",
        archiveCount: "累计归档",
        latestRunStatus: "最近执行状态",
      },
      bindingSummary: {
        title: "当前绑定摘要",
        description:
          "绑定页负责配置账号与凭证，这里专注展示运行态摘要，方便快速判断系统是否健康。",
        boundAccount: "已绑定账号",
        crawlConfig: "抓取配置",
        crawlEnabled: "已开启",
        crawlDisabled: "已关闭",
        interval: "每 {minutes} 分钟执行一次",
        lastCrawl: "最近抓取",
        nextRun: "下一次执行",
        latestError: "最近错误摘要",
        healthyTitle: "运行状态正常",
        healthyDescription:
          "当前绑定没有记录到最近错误，可以继续观察后续自动抓取结果。",
        emptyTitle: "还没有绑定 X 账号",
        emptyDescription:
          "先完成账号绑定和抓取配置，仪表盘才会开始展示抓取时间、执行结果和归档统计。",
        emptyAction: "前往绑定",
      },
      latestRun: {
        title: "最近一次抓取",
        description: "这里展示最近一条执行记录的触发方式、统计结果和错误摘要。",
        startedAt: "开始时间",
        finishedAt: "结束时间",
        fetched: "抓取总数",
        archived: "新增归档",
        skipped: "跳过数量",
        failed: "失败数量",
        errorSummary: "错误摘要",
        viewAll: "查看全部执行记录",
        emptyTitle: "还没有抓取记录",
        emptyDescription:
          "你可以先到绑定页手动触发一次抓取，随后这里会显示最新的执行统计和错误摘要。",
        emptyAction: "立即去抓取",
      },
      failures: {
        title: "错误告警摘要",
        description:
          "汇总当前绑定下的失败执行次数、失败帖子数量，并聚合最近的失败记录。",
        failedRuns: "失败执行次数",
        failedPosts: "失败帖子数量",
        failedPostsInline: "失败帖子 {count}",
        noErrorSummary: "没有记录错误摘要。",
        emptyTitle: "最近没有失败告警",
        emptyDescription:
          "当前绑定下的抓取运行没有失败记录，告警聚合会在出现失败后自动累积。",
        viewRun: "查看失败详情",
      },
    },
    bindings: {
      eyebrow: "账号",
      title: "绑定",
      description:
        "这里专注于 X 账号绑定、登录态校验与凭证维护。抓取策略已经拆分到独立的策略工作区，方便按账号集中管理。",
      accountListTitle: "已绑定账号",
      accountListDescription:
        "一个平台用户可以维护多个 X 账号。点击列表项即可切换下方的账号状态、绑定摘要与操作面板。",
      accountCount: "{count} 个账号",
      statusTitle: "当前绑定状态",
      statusDescription:
        "这里会持续展示当前绑定账号、策略概览、校验结果和最近一次错误摘要。",
      credentialSource: "凭证来源",
      lastValidatedAt: "最近校验",
      nextCrawlAt: "下一次抓取",
      crawlEnabled: "已开启",
      crawlDisabled: "已关闭",
      crawlInterval: "每 {minutes} 分钟",
      latestError: "最近错误",
      emptyTitle: "还没有绑定 X 账号",
      emptyDescription:
        "优先使用右侧的浏览器辅助绑定流程。登录成功后，这里会自动展示绑定状态、抓取配置和最近校验结果。",
      profilesTitle: "抓取策略",
      profilesDescription:
        "每个账号可以配置多个抓取策略。你可以在这里分别管理推荐、热点和搜索模式的启停、频率与即时执行。",
      profileRunSummary: "执行概览：",
      lastRunLabel: "最近执行：",
      nextRunLabel: "下一次：",
      profileModeLabel: "策略模式",
      maxPostsLabel: "单次最多抓取帖子数",
      queryTextLabel: "搜索词",
      queryTextPlaceholder: "例如 AI agents、科技热点",
      profileEnabledLabel: "启用该策略",
      profileEnabledHint: "关闭后不会参与定时扫描，但仍可手动触发。",
      saveProfile: "保存策略",
      savingProfile: "保存策略中...",
      triggerProfileNow: "立即执行该策略",
      addProfileTitle: "新增抓取策略",
      addProfileDescription:
        "给当前账号追加新的热点或搜索策略。搜索模式必须填写搜索词。",
      addProfile: "新增策略",
      addingProfile: "新增中...",
      emptyProfilesTitle: "当前账号还没有抓取策略",
      emptyProfilesDescription:
        "先新增一条策略，或重新保存当前绑定，让系统自动补齐默认推荐策略。",
      crawlConfigTitle: "抓取配置",
      crawlConfigDescription:
        "单独调整抓取开关和抓取周期，不需要重新粘贴凭证。",
      autoCrawlTitle: "自动抓取",
      autoCrawlDescription: "关闭后将不再自动安排下一次抓取。",
      crawlIntervalLabel: "抓取周期（分钟）",
      saveConfig: "保存抓取配置",
      savingConfig: "保存中...",
      operationsTitle: "绑定操作",
      operationsDescription:
        "这里可以立即触发一次抓取、重新校验凭证，或停用当前绑定。",
      triggerNow: "立即抓取",
      triggeringNow: "抓取中...",
      revalidate: "重新校验绑定",
      revalidating: "校验中...",
      disable: "停用绑定",
      disabling: "停用中...",
      unbindWarning:
        "解除绑定会删除当前绑定下的归档帖子和抓取记录。为避免数据损失，请仅在确认不再需要这些数据时执行。",
      unbind: "解除绑定并删除记录",
      unbinding: "解绑中...",
      browserAssistTitle: "浏览器辅助绑定",
      browserAssistDescription:
        "点击下面的按钮后，系统会在当前机器自动打开一个可见的 X 登录窗口。你只需要手动完成登录，剩下的绑定与 Cookie 回填会自动完成。",
      browserAssistDescriptionBound:
        "如果你想刷新某个已绑定账号的登录态，或新增另一个 X 账号，直接重新发起一次浏览器登录即可。系统会自动识别当前登录的是已有账号还是新账号，并分别执行更新或新增绑定。",
      browserFlowTitle: "流程",
      browserFlowDescription:
        "浏览器窗口打开后，请直接在 X 页面里手动登录。当前页面会自动轮询会话状态，并在成功后刷新绑定信息。",
      browserStep1: "1. 点击“打开 X 登录窗口并开始绑定”。",
      browserStep2: "2. 在新打开的浏览器里完成 X 登录或账号切换。",
      browserStep3: "3. 回到当前页面，等待系统自动绑定用户信息与 Cookie。",
      sessionId: "会话 ID",
      sessionExpiresAt: "会话过期时间",
      fillingUserId: "正在回填 X 用户 ID",
      browserSuccess:
        "浏览器登录成功，系统已经自动保存绑定资料与 Cookie。当前页面会自动刷新到最新绑定状态。",
      startBrowserBinding: "打开 X 登录窗口并开始绑定",
      startBrowserBindingAgain: "重新打开新的绑定会话",
      startingBrowserBinding: "正在启动...",
      cancelBrowserBinding: "取消当前会话",
      refreshBindingState: "立即刷新绑定状态",
      browserRemoteDesktopNotice:
        "当前部署运行在容器远程桌面模式。点击按钮后会自动打开一个远程浏览器页签，请在其中完成 X 登录。",
      openBrowserDesktop: "打开远程登录桌面",
      advancedTitle: "高级手动录入",
      advancedDescription:
        "仅在调试、导入历史凭证或处理非标准场景时使用。提交与已存在账号匹配时会更新原绑定，提交不同 X 账号时会新增一条绑定记录。",
      xUserId: "X 用户 ID",
      username: "用户名",
      displayName: "显示名",
      avatarUrl: "头像 URL",
      credentialSourceLabel: "凭证来源",
      credentialPayload: "抓取凭证",
      credentialPayloadHint:
        "如果你手动维护 JSON 凭证，请确保字段结构与后端适配器要求一致。浏览器辅助绑定会自动生成这份凭证，无需手填。",
      enableAutoCrawlAfterSave: "提交后立即启用自动抓取",
      enableAutoCrawlAfterSaveHint: "如果暂时只想保存凭证，也可以先关闭。",
      submit: "创建绑定",
      submitting: "提交中...",
      update: "更新绑定与凭证",
      browserSessionRestoreFailed: "无法恢复浏览器绑定会话。",
      browserSessionPollingFailed: "浏览器绑定轮询失败，请稍后重试。",
      browserSessionStartFailed: "无法启动浏览器绑定流程。",
      browserSessionCancelFailed: "无法取消浏览器绑定流程。",
      browserSessionRequestFailed: "浏览器绑定请求失败，请稍后重试。",
      unbindConfirm:
        "解除绑定会删除当前账号下的归档帖子和抓取记录，且不可恢复。确定继续吗？",
      placeholders: {
        xUserId: "例如 44196397",
        username: "例如 openai",
        displayName: "例如 OpenAI",
        credentialPayload:
          '例如 {"adapter":"real","cookies":[...],"username":"demo_x_user"}',
      },
    },
    strategies: {
      eyebrow: "策略工作区",
      title: "策略",
      description:
        "按账号集中管理推荐、热点和搜索策略。你可以为不同 X 账号分别设置抓取模式、抓取上限和可视化周期。",
      accountListTitle: "账号维度",
      accountListDescription:
        "先选中一个 X 账号，再在右侧查看它的全部策略。这样可以避免多策略场景下在绑定页反复长距离滚动。",
      accountCount: "{count} 个账号",
      workspaceTitle: "当前账号策略",
      workspaceDescription:
        "每张卡片都对应一个独立策略，支持不同模式、不同周期和即时执行。默认推荐策略会随绑定自动创建。",
      selectedAccount: "当前账号",
      selectedAccountHint:
        "策略与绑定账号一对多关联。切换账号后，右侧内容会同步更新。",
      emptyTitle: "还没有策略",
      emptyDescription:
        "当前账号还没有可管理的抓取策略。你可以新建推荐、热点或搜索策略，系统也会在绑定时自动补齐默认推荐策略。",
      noAccountTitle: "先绑定一个 X 账号",
      noAccountDescription:
        "策略中心需要依附绑定账号使用。先去绑定页完成账号接入，再回来配置策略与周期。",
      openBindings: "前往绑定页",
      createStrategy: "新建策略",
      createStrategyForAccount: "为 @{username} 新建策略",
      editStrategy: "编辑策略",
      systemDefaultBadge: "系统默认",
      deleteStrategy: "删除策略",
      deletingStrategy: "删除中...",
      deleteStrategyConfirm:
        "删除后将移除该策略的调度配置。已关联的历史执行与归档记录会保留，但不能恢复。确定继续吗？",
      saveStrategy: "保存策略",
      savingStrategy: "保存中...",
      createStrategyDescription:
        "给当前账号追加新的推荐、热点或搜索策略，并为它设置独立抓取周期。",
      editStrategyDescription:
        "调整当前策略的周期、抓取上限与启停状态。系统默认推荐策略的模式会保持只读。",
      strategyCountLabel: "策略数量",
      strategyCount: "{count} 条策略",
      enabledStrategyLabel: "已启用策略",
      enabledStrategyCount: "{count} 条已启用",
      nextRunSummary: "最近安排：{time}",
      modeLabel: "策略模式",
      scheduleLabel: "抓取周期",
      lastRunLabel: "最近执行",
      nextRunLabel: "下一次执行",
      maxPostsLabel: "单次抓取上限",
      queryTextLabel: "搜索词",
      queryTextPlaceholder: "例如 AI agents、科技热点、创业融资",
      strategyEnabledLabel: "启用该策略",
      strategyEnabledHint: "关闭后不会参与定时调度，但仍可手动执行。",
      triggerNow: "立即执行",
      triggeringNow: "执行中...",
      emptyStrategiesTitle: "当前账号还没有额外策略",
      emptyStrategiesDescription:
        "先创建一条推荐、热点或搜索策略，或编辑默认推荐策略来调整周期。",
      viewBindingWorkspace: "查看绑定工作区",
      modeReadonlyHint: "系统默认推荐策略由绑定配置托管，因此模式保持只读。",
      form: {
        modeLabel: "策略模式",
        accountLabel: "关联账号",
        accountSummary: "@{username} · {displayName}",
        createHint: "可以按需要创建推荐、热点或搜索策略。",
        editHint: "系统默认推荐策略也可以在这里调整周期与抓取上限。",
      },
      scheduleBuilder: {
        customCronHint:
          "支持标准五段 Cron 表达式，例如 `0 9 * * 1-5` 表示工作日 09:00 执行。",
        customCronLabel: "自定义 Cron",
        dailyTimeLabel: "每日执行时间",
        hourlyEveryHoursLabel: "每隔多少小时",
        hourlyMinuteLabel: "每小时的第几分钟",
        intervalMinutesLabel: "间隔分钟数",
        schedulePresetCustom: "自定义",
        schedulePresetDaily: "每天",
        schedulePresetHourly: "按小时",
        schedulePresetInterval: "按分钟",
        schedulePresetLabel: "周期类型",
        schedulePresetWeekly: "每周",
        schedulePreviewLabel: "周期预览",
        scheduleSummaryCustom: "Cron：{expression}",
        scheduleSummaryDaily: "每天 {time}",
        scheduleSummaryHourly: "每 {hours} 小时，第 {minute} 分钟执行",
        scheduleSummaryInterval: "每 {minutes} 分钟执行一次",
        scheduleSummaryWeekly: "每周 {days} · {time}",
        weeklyDaysLabel: "每周执行日",
        weeklyTimeLabel: "每周执行时间",
        weekdays: {
          sun: "周日",
          mon: "周一",
          tue: "周二",
          wed: "周三",
          thu: "周四",
          fri: "周五",
          sat: "周六",
        },
      },
    },
    taxonomy: {
      eyebrow: "分类标签",
      title: "分类标签",
      description:
        "在这里集中维护归档内容的分类体系和标签体系，支持后续筛选、人工编辑和 AI 结果承接。",
      badge: "{count} 个分类与标签",
      errorTitle: "分类标签页面暂时不可用",
      errorDescription: "分类标签数据加载失败，请稍后重试。",
      categoriesTitle: "分类管理",
      categoriesDescription:
        "分类用于为帖子设置单个主分类，适合沉淀主题目录、栏目或长期观察维度。",
      tagsTitle: "标签管理",
      tagsDescription:
        "标签适合表达多维属性，可被人工、AI 或规则同时使用，并服务后续筛选与报告。",
      createCategory: "新建分类",
      createCategoryDescription:
        "填写名称、可选 slug、描述、颜色和排序值，创建后即可在归档详情里选用。",
      editCategory: "编辑分类",
      editCategoryDescription:
        "你可以更新分类名称、描述、颜色、排序和启用状态。",
      saveCategory: "保存分类",
      createTag: "新建标签",
      createTagDescription:
        "标签适合表达多选属性，创建后可在归档详情页被人工添加。",
      editTag: "编辑标签",
      editTagDescription: "你可以更新标签名称、颜色、slug 和启用状态。",
      saveTag: "保存标签",
      saving: "保存中...",
      cancel: "取消",
      edit: "编辑",
      disable: "停用",
      disableCategoryConfirm: "停用后该分类不会再出现在可选列表中，继续吗？",
      disableTagConfirm: "停用后该标签不会再出现在可选列表中，继续吗？",
      statusActive: "启用中",
      statusInactive: "已停用",
      systemBadge: "系统内置",
      customBadge: "自定义",
      noColor: "未设置颜色",
      noCategoryDescription: "还没有填写分类描述。",
      emptyCategories: "当前还没有分类，先创建一个主分类吧。",
      emptyTags: "当前还没有标签，先创建一个标签吧。",
      summary: {
        totalCategories: "分类总数",
        activeCategories: "启用分类",
        totalTags: "标签总数",
        activeTags: "启用标签",
      },
      form: {
        nameLabel: "名称",
        slugLabel: "Slug",
        descriptionLabel: "描述",
        colorLabel: "颜色",
        sortOrderLabel: "排序值",
        statusLabel: "状态",
        categoryNamePlaceholder: "例如 AI 观察",
        categoryDescriptionPlaceholder: "描述这个分类适用于哪些帖子",
        tagNamePlaceholder: "例如 OpenAI",
        slugPlaceholder: "留空则根据名称自动生成",
        colorPlaceholder: "例如 #2563eb",
      },
    },
    ai: {
      eyebrow: "AI 设置",
      title: "AI 模型",
      description:
        "统一管理 AI 提供商密钥、模型参数与任务默认模型，为后续自动分类、报告生成和内容改写提供运行时基础。",
      badge: "{count} 个模型配置",
      errorTitle: "AI 模型页面暂时不可用",
      errorDescription: "AI 提供商或模型数据加载失败，请稍后重试。",
      summary: {
        providerCount: "提供商数量",
        enabledProviders: "已启用提供商",
        modelCount: "模型数量",
        defaultTasks: "默认任务模型",
        totalCalls: "近 30 天调用量",
        successRate: "成功率",
        totalTokens: "Token 总量",
        totalCost: "预估成本",
      },
      usageTitle: "调用审计与成本",
      usageDescription:
        "聚合最近 {days} 天 AI 调用量、Token 消耗、成本预估与限流余量，帮助你判断当前网关容量。",
      usageErrorDescription:
        "AI 调用审计或成本统计暂时不可用，其余配置页面仍可继续使用。",
      usageEmptyTitle: "还没有 AI 调用记录",
      usageEmptyDescription:
        "完成一次模型测试或实际 AI 任务后，这里会开始展示调用量、Token 消耗和成本预估。",
      windowLimitTitle: "窗口限流",
      windowLimitDescription:
        "{seconds} 秒窗口内已使用 {calls} / {limit} 次请求。",
      windowRemainingDescription: "当前窗口剩余 {count} 次请求。",
      dailyBudgetTitle: "日 Token 预算",
      dailyBudgetDescription: "今日已使用 {used} / {limit} Token。",
      dailyBudgetRemainingDescription: "今日剩余 {count} Token。",
      taskBreakdownTitle: "按任务类型",
      providerBreakdownTitle: "按提供商",
      breakdownMeta: "{calls} 次调用 · {tokens} Token · {cost}",
      breakdownEmpty: "当前没有可展示的聚合明细。",
      auditTitle: "最近调用审计",
      auditDescription:
        "每一次 AI 网关调用都会记录任务类型、模型、Token 消耗、成本估算与错误信息，便于后续排查与调优。",
      auditEmptyTitle: "还没有审计记录",
      auditEmptyDescription:
        "当你测试模型连接或触发实际 AI 任务后，最近的调用记录会展示在这里。",
      auditNoProvider: "未关联提供商",
      auditNoModel: "未关联模型",
      auditTaskHeader: "任务与状态",
      auditModelHeader: "模型与提供商",
      auditTargetLabel: "目标对象",
      auditUsageHeader: "Token 与成本",
      auditTimeHeader: "时间",
      auditErrorHeader: "失败描述",
      auditTokensLabel: "Token",
      auditCostLabel: "成本",
      rateLimitedBadge: "触发限流",
      providersTitle: "提供商配置",
      providersDescription:
        "维护 API Key、Base URL 和提供商类型。测试连接会优先使用该提供商下的默认模型或首个模型。",
      createProvider: "新建提供商",
      editProvider: "编辑提供商",
      createProviderDescription:
        "新增一个可被 AI 网关调用的提供商配置。密钥会在后端加密存储。",
      editProviderDescription:
        "更新提供商名称、Base URL、密钥或启用状态。留空 API Key 时保留原值。",
      saveProvider: "保存提供商",
      createModel: "新建模型",
      editModel: "编辑模型",
      createModelDescription:
        "为指定任务添加模型编码、显示名、默认参数与默认任务模型设置。",
      editModelDescription:
        "更新模型编码、任务类型、默认参数与启用状态，或切换默认模型。",
      saveModel: "保存模型",
      testingProvider: "测试中...",
      testProvider: "测试连接",
      testWithDefaultModel: "使用默认 / 首个模型测试",
      testRequiresModel: "请先为该提供商新增至少一个模型，再发起连接测试。",
      setAsDefault: "设为默认",
      defaultBadge: "默认",
      enabledBadge: "已启用",
      disabledBadge: "已停用",
      noBaseUrl: "使用提供商默认地址",
      noParameters: "未配置默认参数",
      providersEmptyTitle: "还没有 AI 提供商",
      providersEmptyDescription:
        "先创建一个提供商，再为分类、报告等任务配置可选模型。",
      modelsTitle: "模型配置",
      modelsDescription:
        "按任务维度维护模型池，并为帖子分类、报告生成、草稿改写指定默认模型。",
      modelsEmptyTitle: "还没有模型配置",
      modelsEmptyDescription:
        "先添加一个提供商，然后创建模型并设置默认任务模型。",
      providerTypeLabel: "提供商类型",
      baseUrlLabel: "Base URL",
      apiKeyLabel: "API Key",
      apiKeyHint: "编辑提供商时留空表示沿用当前密钥。",
      providerNameLabel: "提供商名称",
      modelCodeLabel: "模型编码",
      modelDisplayNameLabel: "显示名称",
      inputTokenPriceLabel: "输入 Token 单价（USD / 1K）",
      outputTokenPriceLabel: "输出 Token 单价（USD / 1K）",
      tokenPriceHint:
        "这两个字段用于估算成本。留空表示只记录 Token 用量，不做美元成本换算。",
      tokenPriceValue: "{value} / 1K",
      noTokenPrice: "未配置",
      taskTypeLabel: "任务类型",
      parametersLabel: "默认参数 JSON",
      parametersHint:
        '输入一个 JSON 对象，例如 `{ "temperature": 0.2, "max_tokens": 1024 }`。',
      enabledLabel: "启用",
      defaultLabel: "默认任务模型",
      hasApiKey: "已保存密钥",
      missingApiKey: "未保存密钥",
      modelCountLabel: "{count} 个模型",
      edit: "编辑",
      form: {
        providerNamePlaceholder: "例如 OpenAI Production",
        baseUrlPlaceholder: "例如 https://openrouter.ai/api/v1",
        apiKeyPlaceholder: "输入 API Key",
        modelCodePlaceholder: "例如 gpt-5.2 或 claude-3-7-sonnet-latest",
        modelDisplayNamePlaceholder: "例如 GPT-5.2 分类模型",
        parametersPlaceholder:
          '{\n  "temperature": 0.2,\n  "max_tokens": 1024\n}',
        providerSelectPlaceholder: "请选择提供商",
      },
    },
    archives: {
      eyebrow: "归档",
      title: "归档",
      description:
        "这里按卡片展示已经归档的推荐帖子，支持分页浏览、查看原文来源和进入详情页。",
      filterTitle: "筛选归档",
      filterDescription:
        "按关键词、帖子类型和时间范围快速收窄结果。筛选提交后会自动从第一页开始展示。",
      keywordPlaceholder: "搜索正文、作者、绑定账号或帖子 ID",
      allTypes: "全部类型",
      applyFilters: "应用筛选",
      clearFilters: "清空",
      keywordBadge: "关键词：{keyword}",
      typeBadge: "类型：{postType}",
      dateBadge: "时间：{dateFrom} - {dateTo}",
      errorTitle: "归档列表加载失败",
      errorAction: "先去检查绑定",
      emptyFilteredTitle: "没有匹配当前筛选条件的归档",
      emptyFilteredDescription:
        "试着放宽关键词、调整类型或修改时间范围，然后重新查询。",
      emptyTitle: "还没有归档内容",
      emptyDescription:
        "先在绑定页完成账号配置并手动抓取一次，系统就会把推荐帖子存档到这里。",
      emptyFilteredAction: "清空筛选",
      emptyAction: "去触发抓取",
      sourceBinding: "来源绑定账号",
      sourceCreatedAt: "原帖发布时间",
      media: "媒体",
      archiveId: "归档 ID",
      mediaIncluded: "包含媒体内容",
      textOnly: "文本帖文",
    },
    archiveDetail: {
      eyebrow: "归档详情",
      titleFallback: "归档详情",
      descriptionReady:
        "这里展示归档富文本正文、媒体资源、来源链接和本次归档的上下文信息。",
      descriptionLoading: "归档详情正在准备中。",
      openOriginal: "打开原帖",
      errorTitle: "归档详情暂时不可用",
      errorAction: "返回归档列表",
      archivedAt: "归档于",
      sourceBinding: "来源绑定账号",
      sourceCreatedAt: "原帖发布时间",
      metrics: {
        replies: "回复",
        reposts: "转推",
        quotes: "引用",
        likesViews: "喜欢 / 浏览",
      },
      sourceContextTitle: "来源与上下文",
      sourceContextDescription:
        "这里保留原帖链接、绑定来源和首次归档执行记录，方便回溯抓取过程。",
      originalPost: "原帖链接",
      binding: "绑定来源",
      firstRun: "首次归档执行",
      viewRun: "查看本次执行记录",
      mediaTitle: "媒体与关联",
      mediaDescription:
        "这里保留媒体资源入口和引用关系；图片、视频会直接在帖子正文中展示。",
      mediaInlineHint: "媒体预览已在正文中显示，这里保留资源入口。",
      noMediaTitle: "这条归档没有媒体资源",
      noMediaDescription:
        "当前帖子只包含文本内容，富文本正文中不会出现图片或视频块。",
      openRelatedPost: "打开关联原帖",
      targetAuthor: "目标作者：@{username}",
      taxonomyTitle: "分类与标签",
      taxonomyDescription:
        "在这里维护归档帖子的主分类与多标签结果，AI 自动打标和人工调整会共同沉淀为同一套可编辑结果。",
      currentCategoryLabel: "当前主分类",
      currentTagsLabel: "当前标签",
      noPrimaryCategory: "尚未设置主分类",
      noTags: "还没有标签",
      primaryCategoryLabel: "主分类",
      chooseCategory: "不设置主分类",
      tagsFieldLabel: "标签选择",
      chooseTags: "选择标签",
      tagPickerHint: "展开后可搜索并多选标签",
      selectedTagsCount: "已选 {count} 个标签",
      searchTagsPlaceholder: "搜索标签名称",
      noMatchingTags: "没有匹配的标签",
      taxonomyEditorHint:
        "这里编辑的是当前归档的最终标签集合。AI 自动创建的标签也会出现在同一套列表里，可直接修改或删除。",
      lockBadge: "已锁定",
      noTagOptions: "当前还没有可选标签，请先在分类标签页中创建标签。",
      taxonomyLockHint:
        "保存后，当前分类和标签集合会进入锁定状态，后续 AI 重跑默认不会覆盖它们，直到你再次手动调整。",
      taxonomyLoadError: "分类与标签选项加载失败。",
      saveTaxonomy: "保存分类与标签",
      saveTaxonomyPending: "正在保存分类与标签...",
    },
    runs: {
      eyebrow: "任务历史",
      title: "运行记录",
      description:
        "这里按时间倒序展示抓取执行记录，方便回看触发方式、统计结果、失败原因和详情入口。",
      errorTitle: "抓取记录加载失败",
      errorAction: "返回绑定页",
      emptyTitle: "还没有执行记录",
      emptyDescription:
        "先在绑定页完成账号配置并发起一次抓取，系统就会开始在这里沉淀执行历史。",
      emptyAction: "去触发抓取",
      createdAt: "创建于",
      bindingAccount: "绑定账号",
      startedAt: "开始",
      finishedAt: "结束",
      fetched: "抓取总数",
      newCount: "新增",
      skipped: "跳过",
      failed: "失败",
      errorSummary: "错误摘要",
      noErrorSummary: "当前记录没有错误摘要",
      backToBindings: "返回绑定页",
    },
    reports: {
      eyebrow: "报告中心",
      title: "报告中心",
      description:
        "按周期汇总归档帖子，生成周报或月报，并在这里统一查看、编辑与后续发布准备。",
      badge: "{count} 份报告",
      generateTitle: "生成新报告",
      generateDescription:
        "选择统计周期和过滤条件后，系统会基于归档内容调用 AI 生成结构化报告草稿。",
      generateBadge: "AI Summary",
      generateAction: "生成报告",
      generating: "生成中...",
      filterTitle: "筛选条件",
      filterDescription:
        "可以按绑定账号、抓取模式、分类和标签限定报告范围，也可以在列表中按周期与状态筛选历史报告。",
      noBindingsHint: "还没有可用于汇总的绑定账号。",
      noCategoriesHint: "当前没有启用中的分类可用于筛选。",
      noTagsHint: "当前没有启用中的标签可用于筛选。",
      allReportTypes: "全部周期",
      allStatuses: "全部状态",
      applyFilters: "应用筛选",
      clearFilters: "清空筛选",
      errorTitle: "报告列表暂时不可用",
      emptyTitle: "还没有生成过报告",
      emptyDescription:
        "先选择一个时间范围生成周报或月报，系统会把 AI 输出的标题、摘要和正文沉淀在这里。",
      emptyAction: "立即生成报告",
      createdAtLabel: "创建时间",
      updatedAtLabel: "最近更新",
      periodLabel: "统计周期",
      sourcePostsLabel: "来源帖子",
      reportIdLabel: "报告 ID",
      summaryLabel: "摘要",
      noSummary: "当前报告还没有可展示的摘要。",
      viewDetail: "查看详情",
      form: {
        reportTypeLabel: "报告周期",
        statusLabel: "报告状态",
        periodStartLabel: "起始日期",
        periodEndLabel: "结束日期",
        bindingFilterLabel: "绑定账号",
        modeFilterLabel: "抓取模式",
        categoryFilterLabel: "分类",
        tagFilterLabel: "标签",
      },
    },
    reportDetail: {
      eyebrow: "报告详情",
      titleFallback: "报告详情",
      descriptionReady:
        "这里展示 AI 生成的报告正文、来源帖子、上下文信息，以及后续人工编辑入口。",
      descriptionLoading: "报告详情正在准备中。",
      errorTitle: "报告详情暂时不可用",
      errorAction: "返回报告中心",
      periodLabel: "统计周期",
      createdAtLabel: "创建时间",
      updatedAtLabel: "最近更新",
      summaryTitle: "报告摘要",
      noSummary: "当前报告还没有摘要。",
      sourcePostsTitle: "来源帖子",
      sourcePostsDescription:
        "这些归档帖子参与了本次报告聚合，你可以继续回看归档详情或打开原帖来源。",
      sourcePostLabel: "来源帖子",
      viewArchive: "查看归档",
      openSourcePost: "查看来源帖子",
      emptySourcePostsTitle: "当前报告没有关联来源帖子",
      emptySourcePostsDescription:
        "如果这是一次失败生成或数据被清理，来源帖子列表可能为空。",
      contextTitle: "报告上下文",
      contextDescription:
        "这里记录报告的周期、来源帖子数量和创建更新时间，便于判断这份报告的新鲜度。",
      sourcePostsCountLabel: "来源帖子数量",
      sourcePostsCount: "{count} 条帖子",
      editorTitle: "人工编辑",
      editorDescription:
        "你可以在 AI 结果基础上继续调整标题和正文，保存后会更新当前报告内容。",
      titleLabel: "报告标题",
      bodyLabel: "报告正文",
      bodyPlaceholder: "在这里补充或修改报告正文。",
      bodyHint: "当前编辑器使用纯文本输入，保存后会自动转换为平台内的富文本文档。",
      save: "保存修改",
      saving: "保存中...",
      regenerateTitle: "重新生成",
      regenerateDescription:
        "基于当前报告的原始周期和过滤条件重新调用 AI 生成内容，适合在更换模型或更新归档后重跑。",
      regenerate: "重新生成报告",
      regenerating: "重新生成中...",
      publishTitle: "发布草稿",
      publishDescription:
        "这里将承接后续的一键发布流程，把报告整理为面向外部平台的发布草稿。",
      publishPendingHint:
        "当前版本先完成报告查看、编辑和重生成能力。发布草稿与多平台投放将在后续 TODO 中继续实现。",
      publishAction: "发起发布草稿",
    },
    runDetail: {
      eyebrow: "执行详情",
      titleFallback: "执行详情",
      title: "运行 {id}",
      descriptionReady:
        "这里展示单次抓取的状态、统计结果、错误信息和每条帖子处理结果。",
      descriptionLoading: "执行详情正在准备中。",
      viewBinding: "查看绑定",
      errorTitle: "抓取记录详情暂时不可用",
      errorAction: "返回执行记录列表",
      createdAt: "创建于",
      bindingAccount: "绑定账号",
      startedAt: "开始",
      finishedAt: "结束",
      fetched: "抓取总数",
      archived: "新增归档",
      skipped: "跳过数量",
      failed: "失败数量",
      runItemsTitle: "处理项列表",
      runItemsDescription:
        "每条推荐帖子都会在这里留下 `CREATED`、`SKIPPED` 或 `FAILED` 结果。",
      recordTime: "记录时间",
      viewArchive: "查看归档详情",
      noArchiveEntity: "该处理项没有归档实体",
      emptyTitle: "当前执行还没有处理项记录",
      emptyDescription:
        "如果任务仍在排队或运行中，处理项会随着归档流程继续写入。",
      contextTitle: "执行上下文",
      contextDescription:
        "用于确认本次运行归属于哪个绑定、哪个调度任务，以及当前调度配置状态。",
      binding: "绑定",
      crawlJob: "抓取任务",
      crawlJobEnabled: "已启用",
      crawlJobDisabled: "已停用",
      nextRun: "下一次执行",
      errorInfoTitle: "错误信息",
      errorInfoDescription:
        "若本次执行出现整体失败或部分失败，这里会展示摘要和结构化错误详情。",
      errorSummary: "错误摘要",
      noErrorSummary: "当前执行没有记录错误摘要",
      noErrorDetail: "当前没有结构化 `errorDetail` 数据。",
    },
    enums: {
      bindingStatus: {
        ACTIVE: "有效",
        INVALID: "失效",
        DISABLED: "已停用",
        PENDING: "待完成",
        UNBOUND: "未绑定",
      },
      runStatus: {
        QUEUED: "排队中",
        RUNNING: "执行中",
        SUCCESS: "成功",
        PARTIAL_FAILED: "部分失败",
        FAILED: "失败",
        CANCELLED: "已取消",
        NO_RUN: "暂无记录",
      },
      triggerType: {
        MANUAL: "手动",
        SCHEDULED: "定时",
        RETRY: "重试",
      },
      crawlMode: {
        RECOMMENDED: "推荐模式",
        HOT: "热点模式",
        SEARCH: "搜索模式",
      },
      postType: {
        POST: "原帖",
        REPOST: "转推",
        QUOTE: "引用",
        REPLY: "回复",
      },
      credentialSource: {
        WEB_LOGIN: "网页登录态",
        COOKIE_IMPORT: "Cookie 导入",
        EXTENSION: "扩展采集",
      },
      browserSessionStatus: {
        PENDING: "正在拉起浏览器",
        WAITING_LOGIN: "等待你在 X 中登录",
        SUCCESS: "绑定成功",
        FAILED: "绑定失败",
        EXPIRED: "会话已过期",
        CANCELLED: "会话已取消",
      },
      actionType: {
        CREATED: "已创建",
        SKIPPED: "已跳过",
        FAILED: "失败",
      },
      relationType: {
        QUOTE: "引用",
        REPOST: "转推",
        REPLY: "回复",
      },
      taxonomySource: {
        MANUAL: "人工",
        AI: "AI",
        RULE: "规则",
      },
      aiProviderType: {
        OPENAI: "OpenAI",
        ANTHROPIC: "Anthropic",
        GEMINI: "Gemini",
        OPENAI_COMPATIBLE: "OpenAI Compatible",
      },
      aiTaskType: {
        POST_CLASSIFY: "帖子分类",
        REPORT_SUMMARY: "报告总结",
        DRAFT_REWRITE: "草稿改写",
      },
      aiTaskStatus: {
        PENDING: "待执行",
        RUNNING: "执行中",
        SUCCESS: "成功",
        FAILED: "失败",
        CANCELLED: "已取消",
      },
      reportType: {
        WEEKLY: "周报",
        MONTHLY: "月报",
      },
      reportStatus: {
        DRAFT: "草稿",
        READY: "已完成",
        FAILED: "生成失败",
      },
    },
    actions: {
      login: {
        invalidEmail: "请输入有效邮箱",
        invalidPassword: "密码至少需要 8 位",
        invalidInput: "登录信息格式不正确",
        invalidCredentials: "邮箱或密码错误，请检查后重试。",
        failed: "登录失败，请稍后重试。",
      },
      bindings: {
        missingXUserId: "请填写 X 用户 ID",
        missingUsername: "请填写 X 用户名",
        invalidAvatarUrl: "头像地址必须是有效 URL",
        missingCredentialPayload: "请粘贴抓取凭证",
        missingCrawlInterval: "请填写抓取周期",
        invalidCrawlIntervalInt: "抓取周期必须为整数",
        invalidCrawlIntervalMin: "抓取周期不能小于 5 分钟",
        invalidCrawlIntervalMax: "抓取周期不能超过 1440 分钟",
        missingMaxPosts: "请填写单次抓取上限",
        invalidMaxPostsInt: "单次抓取上限必须为整数",
        invalidMaxPostsMin: "单次抓取上限不能小于 1",
        invalidMaxPostsMax: "单次抓取上限不能超过 200",
        missingBindingId: "缺少绑定 ID。",
        missingProfileId: "缺少策略 ID。",
        missingQueryText: "搜索模式必须填写搜索词。",
        missingScheduleCron: "Cron 周期必须填写表达式。",
        bindingValidationFailed: "绑定信息校验失败。",
        profileValidationFailed: "抓取策略校验失败。",
        bindingSaved: "绑定信息已保存。",
        profileCreated: "抓取策略已创建。",
        profileUpdated: "抓取策略已更新。",
        profileDeleted: "抓取策略已删除。",
        configValidationFailed: "抓取配置校验失败。",
        configSaved: "抓取配置已更新。",
        bindingRevalidated: "绑定状态已重新校验。",
        bindingDisabled: "绑定已停用。",
        bindingUnbound:
          "绑定已解除，并删除 {deletedArchiveCount} 条归档、{deletedRunCount} 条抓取记录。",
        viewCurrentRun: "查看当前抓取记录",
        viewTriggeredRun: "查看本次抓取记录",
        manualCrawlTriggered:
          "手动抓取已执行，当前状态：{status}（{triggerType}）。",
        profileManualTriggered:
          "策略抓取已执行，当前状态：{status}（{triggerType}）。",
      },
      archives: {
        missingArchiveId: "缺少归档 ID。",
        taxonomyUpdated: "人工分类与标签已保存。",
        taxonomyValidationFailed: "归档分类标签校验失败。",
      },
      taxonomy: {
        missingName: "请填写名称。",
        invalidColor: "颜色必须是合法的十六进制色值。",
        invalidSortOrder: "排序值必须是整数。",
        missingCategoryId: "缺少分类 ID。",
        missingTagId: "缺少标签 ID。",
        categoryValidationFailed: "分类表单校验失败。",
        categoryCreated: "分类已创建。",
        categoryUpdated: "分类已更新。",
        categoryDisabled: "分类已停用。",
        tagValidationFailed: "标签表单校验失败。",
        tagCreated: "标签已创建。",
        tagUpdated: "标签已更新。",
        tagDisabled: "标签已停用。",
      },
      ai: {
        missingProviderId: "缺少提供商 ID。",
        missingProviderName: "请填写提供商名称。",
        missingProviderType: "请选择提供商类型。",
        missingApiKey: "请填写 API Key。",
        missingModelId: "缺少模型 ID。",
        missingProviderConfigId: "请选择所属提供商。",
        missingModelCode: "请填写模型编码。",
        missingDisplayName: "请填写模型显示名。",
        missingTaskType: "请选择任务类型。",
        invalidParametersJson: "默认参数必须是合法的 JSON 对象。",
        invalidTokenPrice: "Token 单价必须是大于等于 0 的数字。",
        defaultModelRequiresEnabled: "默认模型必须保持启用状态。",
        providerValidationFailed: "AI 提供商表单校验失败。",
        providerCreated: "AI 提供商已创建。",
        providerUpdated: "AI 提供商已更新。",
        modelValidationFailed: "AI 模型表单校验失败。",
        modelCreated: "AI 模型已创建。",
        modelUpdated: "AI 模型已更新。",
        modelDefaultUpdated: "默认任务模型已切换。",
        providerTested: "连接测试成功，模型 {model} 返回：{text}",
      },
      reports: {
        missingReportType: "请选择报告周期。",
        missingPeriodStart: "请选择报告起始日期。",
        missingPeriodEnd: "请选择报告结束日期。",
        invalidPeriodRange: "结束日期不能早于起始日期。",
        missingReportId: "缺少报告 ID。",
        missingReportTitle: "请填写报告标题。",
        missingBodyText: "请填写报告正文。",
        generateValidationFailed: "报告生成参数校验失败。",
        updateValidationFailed: "报告编辑内容校验失败。",
        regenerateValidationFailed: "报告重生成校验失败。",
        reportUpdated: "报告内容已保存。",
        reportRegenerated: "报告已重新生成。",
      },
      api: {
        unauthorized: "未登录或会话已失效。",
        requestFailed: "请求失败，请稍后重试。",
      },
    },
  },
  en: {
    metadata: {
      description: "X recommendation capture, archive, and task workspace",
    },
    shell: {
      subtitle:
        "Real X binding, recommendation capture, and rich-text archiving",
      badge: "Browser Binding",
      nav: {
        overview: "Overview",
        dashboard: "Dashboard",
        bindings: "Bindings",
        strategies: "Strategies",
        reports: "Reports",
        ai: "AI Models",
        taxonomy: "Taxonomy",
        archives: "Archives",
        runs: "Runs",
      },
      localeLabel: "Language",
      localeOptions: {
        "zh-CN": "中文",
        en: "EN",
      },
      themeLabel: "Theme",
      themeLight: "Light",
      themeDark: "Dark",
    },
    common: {
      notRecorded: "Not recorded",
      notScheduled: "Not scheduled",
      noDisplayName: "No display name",
      noMedia: "No media",
      startDate: "Start",
      untilNow: "Now",
      openOriginal: "Open original post",
      backToList: "Back to list",
      viewDetails: "View details",
      openMedia: "Open media",
      noTargetAuthor: "Target author not recorded",
      mediaItem: "Media",
      unknownSize: "Unknown size",
      seconds: "s",
      createdAt: "Created",
      finishedAt: "Finished",
      archiveAt: "Archived",
      runId: "Run ID",
      postCountLabel: "posts",
      runCountLabel: "runs",
      xPostId: "Post ID",
      errorDetail: "Structured error detail",
    },
    pagination: {
      pageSummary: "Page {page} / {totalPages}",
      totalRecords: "{total} records total",
      previous: "Previous",
      next: "Next",
      reachedEnd: "End reached",
    },
    home: {
      eyebrow: "Product Overview",
      title: "Turn the X home timeline into searchable archives",
      description:
        "Bind a real X account through a browser-assisted flow, capture recommended posts on schedule, deduplicate them, and preserve the content as rich-text cards for later review.",
      badge: "Real X Workflow",
      actions: {
        dashboard: "Open dashboard",
        bindings: "Start binding",
      },
      setupCards: [
        {
          title: "Real account binding",
          description:
            "The platform opens a visible browser for X sign-in, then captures account information and cookies automatically after you log in.",
        },
        {
          title: "Scheduled capture and deduplication",
          description:
            "The system captures the home timeline on schedule, stores every run result, and deduplicates by binding plus post ID.",
        },
        {
          title: "Rich-text archive experience",
          description:
            "Posts are stored as rich-text archives with paginated cards, detail pages, source links, and run history for backtracking.",
        },
      ],
      progress: {
        badge: "Core Capabilities",
        title: "One flow for binding, capture, archiving, and review",
        description:
          "The MVP focuses on the core content workflow: bind a real X session, capture recommended posts reliably, and turn valuable timeline items into searchable archives.",
        milestones: [
          "Browser-assisted sign-in with automatic cookie and account backfill",
          "Deduplication by binding account plus post ID",
          "Run history, error summaries, and archive detail pages",
        ],
      },
      nextStep: {
        title: "Tech Stack",
        description:
          "The frontend uses Next.js, ShadCN UI, Tailwind CSS, and TypeScript. The backend uses NestJS and Prisma, with PostgreSQL for storage and NextAuth.js for authentication.",
        action:
          "Supports both local Docker deployment and a Vercel plus Neon cloud setup.",
      },
    },
    login: {
      heroBadge: "Development Auth",
      heroTitle: "Sign in before accessing bindings, archives, and task pages",
      heroDescription:
        "At this stage the platform uses account-and-password login, and persists sessions to PostgreSQL through NextAuth + Prisma Adapter. Later we can add email codes or OAuth without rebuilding the protected route structure.",
      accountTitle: "Development test account",
      accountEmail: "Email: `demo@example.com`",
      accountPassword: "Password: `demo123456`",
      accountHint:
        "This account is created automatically by the database seed script.",
      loadingTitle: "Preparing login form",
      loadingDescription:
        "Reading callback parameters and initializing the session form.",
      formTitle: "Sign in",
      emailLabel: "Email",
      passwordLabel: "Password",
      sessionHint:
        "After sign-in, a NextAuth session is stored in PostgreSQL and read on the server to protect application pages.",
      submit: "Enter workspace",
      submitting: "Signing in...",
    },
    dashboard: {
      eyebrow: "Workspace",
      title: "Dashboard",
      description:
        "This page summarizes the current binding status, next crawl schedule, latest execution result, and total archive scale.",
      manageBindings: "Manage bindings",
      signOut: "Sign out",
      errorTitle: "Dashboard is temporarily unavailable",
      errorAction: "Check bindings first",
      stats: {
        bindingStatus: "Binding status",
        nextRun: "Next crawl",
        archiveCount: "Archived total",
        latestRunStatus: "Latest run status",
      },
      bindingSummary: {
        title: "Current binding summary",
        description:
          "Bindings configure the account and credentials. This panel focuses on runtime status so you can quickly tell whether the system looks healthy.",
        boundAccount: "Bound account",
        crawlConfig: "Crawl config",
        crawlEnabled: "Enabled",
        crawlDisabled: "Disabled",
        interval: "Runs every {minutes} minutes",
        lastCrawl: "Last crawl",
        nextRun: "Next run",
        latestError: "Latest error summary",
        healthyTitle: "Runtime looks healthy",
        healthyDescription:
          "No recent errors have been recorded for the current binding. You can continue observing future automatic crawls.",
        emptyTitle: "No X account is bound yet",
        emptyDescription:
          "Complete account binding and crawl configuration first, then the dashboard will begin showing schedules, execution results, and archive totals.",
        emptyAction: "Go to bindings",
      },
      latestRun: {
        title: "Latest crawl run",
        description:
          "This section shows the latest trigger type, result counts, and error summary.",
        startedAt: "Started at",
        finishedAt: "Finished at",
        fetched: "Fetched",
        archived: "Archived",
        skipped: "Skipped",
        failed: "Failed",
        errorSummary: "Error summary",
        viewAll: "View all runs",
        emptyTitle: "No crawl runs yet",
        emptyDescription:
          "You can trigger one run from the bindings page first, and this panel will then display the latest stats and errors.",
        emptyAction: "Trigger a crawl",
      },
      failures: {
        title: "Failure summary",
        description:
          "Aggregates failed run counts, failed post counts, and the most recent failed runs for the current binding.",
        failedRuns: "Failed runs",
        failedPosts: "Failed posts",
        failedPostsInline: "{count} failed posts",
        noErrorSummary: "No error summary was recorded.",
        emptyTitle: "No recent failures",
        emptyDescription:
          "There are currently no failed crawl runs under this binding. Aggregated alerts will appear automatically once failures happen.",
        viewRun: "View failure details",
      },
    },
    bindings: {
      eyebrow: "Account",
      title: "Bindings",
      description:
        "This workspace focuses on X account binding, session revalidation, and credential maintenance. Crawl strategies now live in a dedicated strategies workspace.",
      accountListTitle: "Bound accounts",
      accountListDescription:
        "A single platform user can maintain multiple X accounts. Select one from the list to switch the account summary and actions shown below.",
      accountCount: "{count} accounts",
      statusTitle: "Current binding status",
      statusDescription:
        "This panel continuously shows the current account, strategy summary, validation result, and latest error.",
      credentialSource: "Credential source",
      lastValidatedAt: "Last validated",
      nextCrawlAt: "Next crawl",
      crawlEnabled: "Enabled",
      crawlDisabled: "Disabled",
      crawlInterval: "Every {minutes} minutes",
      latestError: "Latest error",
      emptyTitle: "No X account is bound yet",
      emptyDescription:
        "Prefer the browser-assisted binding flow on the right. Once login succeeds, this panel will update automatically with binding status, crawl config, and validation results.",
      profilesTitle: "Crawl profiles",
      profilesDescription:
        "Each account can keep multiple crawl strategies. Manage recommended, hot, and search modes with their own schedules and manual runs here.",
      profileRunSummary: "Run summary:",
      lastRunLabel: "Last run: ",
      nextRunLabel: "Next run: ",
      profileModeLabel: "Profile mode",
      maxPostsLabel: "Max posts per run",
      queryTextLabel: "Search query",
      queryTextPlaceholder: "For example AI agents or tech trends",
      profileEnabledLabel: "Enable this profile",
      profileEnabledHint:
        "Disabled profiles are skipped by the scheduler, but can still be triggered manually.",
      saveProfile: "Save profile",
      savingProfile: "Saving profile...",
      triggerProfileNow: "Run this profile now",
      addProfileTitle: "Add crawl profile",
      addProfileDescription:
        "Add a new hot or search strategy to the current account. Search mode requires a query text.",
      addProfile: "Add profile",
      addingProfile: "Adding...",
      emptyProfilesTitle: "No crawl profiles yet",
      emptyProfilesDescription:
        "Create a profile first or save the binding again so the default recommended profile can be restored.",
      crawlConfigTitle: "Crawl config",
      crawlConfigDescription:
        "Adjust the crawl switch and interval without pasting credentials again.",
      autoCrawlTitle: "Automatic crawl",
      autoCrawlDescription:
        "If turned off, no next crawl will be scheduled automatically.",
      crawlIntervalLabel: "Crawl interval (minutes)",
      saveConfig: "Save crawl config",
      savingConfig: "Saving...",
      operationsTitle: "Binding actions",
      operationsDescription:
        "Trigger a crawl now, revalidate credentials, or disable the current binding.",
      triggerNow: "Run now",
      triggeringNow: "Running...",
      revalidate: "Revalidate binding",
      revalidating: "Validating...",
      disable: "Disable binding",
      disabling: "Disabling...",
      unbindWarning:
        "Unbinding will delete archived posts and crawl run records under this binding. Only do this when you are sure the data is no longer needed.",
      unbind: "Unbind and delete records",
      unbinding: "Unbinding...",
      browserAssistTitle: "Browser-assisted binding",
      browserAssistDescription:
        "After clicking the button below, the system opens a visible X login window on the current machine. You only need to complete the login manually, and the binding plus cookie capture will finish automatically.",
      browserAssistDescriptionBound:
        "If you want to refresh the login state for an existing account or add another X account, simply launch the browser login flow again. The system will recognize whether the signed-in account already exists and update or create the binding accordingly.",
      browserFlowTitle: "Flow",
      browserFlowDescription:
        "Once the browser window opens, sign in on X directly. This page polls the session state automatically and refreshes binding info after success.",
      browserStep1: '1. Click "Open X login window and start binding".',
      browserStep2:
        "2. Complete X login or switch account in the newly opened browser.",
      browserStep3:
        "3. Return to this page and wait for the system to bind account info and cookies automatically.",
      sessionId: "Session ID",
      sessionExpiresAt: "Session expires at",
      fillingUserId: "Backfilling X user ID",
      browserSuccess:
        "Browser login succeeded. The system has already saved binding information and cookies, and this page will refresh to the latest binding state.",
      startBrowserBinding: "Open X login window and start binding",
      startBrowserBindingAgain: "Open a new binding session again",
      startingBrowserBinding: "Starting...",
      cancelBrowserBinding: "Cancel current session",
      refreshBindingState: "Refresh binding state now",
      browserRemoteDesktopNotice:
        "This deployment is using container-based remote desktop mode. After you click the button, a remote browser tab will open for the X sign-in flow.",
      openBrowserDesktop: "Open remote login desktop",
      advancedTitle: "Advanced manual input",
      advancedDescription:
        "Use this only for debugging, importing historical credentials, or non-standard scenarios. Matching an existing X account updates that binding, while submitting a different account creates a new binding record.",
      xUserId: "X user ID",
      username: "Username",
      displayName: "Display name",
      avatarUrl: "Avatar URL",
      credentialSourceLabel: "Credential source",
      credentialPayload: "Crawl credentials",
      credentialPayloadHint:
        "If you maintain JSON credentials manually, make sure the field structure matches the backend adapter requirements. Browser-assisted binding generates these credentials automatically.",
      enableAutoCrawlAfterSave: "Enable automatic crawl immediately after save",
      enableAutoCrawlAfterSaveHint:
        "If you only want to save credentials for now, you can switch it off first.",
      submit: "Create binding",
      submitting: "Submitting...",
      update: "Update binding and credentials",
      browserSessionRestoreFailed:
        "Unable to restore the browser binding session.",
      browserSessionPollingFailed:
        "Browser binding polling failed. Please try again later.",
      browserSessionStartFailed: "Unable to start the browser binding flow.",
      browserSessionCancelFailed: "Unable to cancel the browser binding flow.",
      browserSessionRequestFailed:
        "Browser binding request failed. Please try again later.",
      unbindConfirm:
        "Unbinding will delete archived posts and crawl run records under the current account, and it cannot be undone. Continue?",
      placeholders: {
        xUserId: "For example 44196397",
        username: "For example openai",
        displayName: "For example OpenAI",
        credentialPayload:
          'For example {"adapter":"real","cookies":[...],"username":"demo_x_user"}',
      },
    },
    strategies: {
      eyebrow: "Strategy workspace",
      title: "Strategies",
      description:
        "Manage recommended, hot, and search strategies by account. Each bound X account can carry its own modes, fetch limits, and visualized schedules.",
      accountListTitle: "Accounts",
      accountListDescription:
        "Select an X account first, then manage all of its strategies on the right. This keeps high-volume strategy management out of the bindings page.",
      accountCount: "{count} accounts",
      workspaceTitle: "Strategies for this account",
      workspaceDescription:
        "Each card represents one independent strategy with its own mode, cadence, post limit, and manual run entry point. The default recommended strategy is provisioned automatically.",
      selectedAccount: "Selected account",
      selectedAccountHint:
        "Strategies are linked one-to-many with bound accounts. Switch accounts to update the workspace context.",
      emptyTitle: "No strategies yet",
      emptyDescription:
        "This account does not have manageable crawl strategies yet. Create recommended, hot, or search strategies, or rely on the default recommended strategy created during binding.",
      noAccountTitle: "Bind an X account first",
      noAccountDescription:
        "The strategy center depends on bound accounts. Finish the account setup on the bindings page, then return here to manage schedules.",
      openBindings: "Go to bindings",
      createStrategy: "New strategy",
      createStrategyForAccount: "Create strategy for @{username}",
      editStrategy: "Edit strategy",
      systemDefaultBadge: "System default",
      deleteStrategy: "Delete strategy",
      deletingStrategy: "Deleting...",
      deleteStrategyConfirm:
        "Deleting removes this strategy configuration. Historical runs and archives stay intact, but the strategy itself cannot be restored. Continue?",
      saveStrategy: "Save strategy",
      savingStrategy: "Saving...",
      createStrategyDescription:
        "Add a new recommended, hot, or search strategy for the current account and give it an independent schedule.",
      editStrategyDescription:
        "Adjust the schedule, post limit, and enable state for the current strategy. The system default recommended strategy keeps its mode read-only.",
      strategyCountLabel: "Strategy count",
      strategyCount: "{count} strategies",
      enabledStrategyLabel: "Enabled strategies",
      enabledStrategyCount: "{count} enabled",
      nextRunSummary: "Next schedule: {time}",
      modeLabel: "Mode",
      scheduleLabel: "Schedule",
      lastRunLabel: "Last run",
      nextRunLabel: "Next run",
      maxPostsLabel: "Max posts per run",
      queryTextLabel: "Search query",
      queryTextPlaceholder: "For example AI agents, startup funding, robotics",
      strategyEnabledLabel: "Enable this strategy",
      strategyEnabledHint:
        "Disabled strategies are skipped by the scheduler, but they can still be run manually.",
      triggerNow: "Run now",
      triggeringNow: "Running...",
      emptyStrategiesTitle: "No additional strategies yet",
      emptyStrategiesDescription:
        "Create a recommended, hot, or search strategy first, or edit the default recommended strategy to change its cadence.",
      viewBindingWorkspace: "Open binding workspace",
      modeReadonlyHint:
        "The system default recommended strategy is managed by the binding configuration, so its mode stays read-only.",
      form: {
        modeLabel: "Strategy mode",
        accountLabel: "Bound account",
        accountSummary: "@{username} · {displayName}",
        createHint: "Create recommended, hot, or search strategies as needed.",
        editHint:
          "The system default recommended strategy can also be tuned here.",
      },
      scheduleBuilder: {
        customCronHint:
          "Supports five-field Cron expressions. Example: `0 9 * * 1-5` runs at 09:00 on weekdays.",
        customCronLabel: "Custom Cron",
        dailyTimeLabel: "Daily run time",
        hourlyEveryHoursLabel: "Repeat every N hours",
        hourlyMinuteLabel: "Minute within the hour",
        intervalMinutesLabel: "Interval in minutes",
        schedulePresetCustom: "Custom",
        schedulePresetDaily: "Daily",
        schedulePresetHourly: "Hourly",
        schedulePresetInterval: "Interval",
        schedulePresetLabel: "Schedule preset",
        schedulePresetWeekly: "Weekly",
        schedulePreviewLabel: "Schedule preview",
        scheduleSummaryCustom: "Cron: {expression}",
        scheduleSummaryDaily: "Every day at {time}",
        scheduleSummaryHourly: "Every {hours} hours at minute {minute}",
        scheduleSummaryInterval: "Every {minutes} minutes",
        scheduleSummaryWeekly: "Every week on {days} at {time}",
        weeklyDaysLabel: "Days of week",
        weeklyTimeLabel: "Weekly run time",
        weekdays: {
          sun: "Sun",
          mon: "Mon",
          tue: "Tue",
          wed: "Wed",
          thu: "Thu",
          fri: "Fri",
          sat: "Sat",
        },
      },
    },
    taxonomy: {
      eyebrow: "Taxonomy",
      title: "Category and tags",
      description:
        "Manage archive categories and multi-tag vocabularies in one place so filters, manual editing, and future AI workflows can reuse the same structure.",
      badge: "{count} categories and tags",
      errorTitle: "Taxonomy is temporarily unavailable",
      errorDescription: "Failed to load taxonomy data. Please try again later.",
      categoriesTitle: "Categories",
      categoriesDescription:
        "Categories provide a single primary topic for each archived post and work well for long-term tracks, columns, and reporting dimensions.",
      tagsTitle: "Tags",
      tagsDescription:
        "Tags capture multi-dimensional attributes and can later be assigned manually, by AI models, or by automation rules.",
      createCategory: "New category",
      createCategoryDescription:
        "Fill in the name, optional slug, description, color, and sort order. The category will be available in archive details immediately.",
      editCategory: "Edit category",
      editCategoryDescription:
        "Update the category name, description, color, sort order, and active state here.",
      saveCategory: "Save category",
      createTag: "New tag",
      createTagDescription:
        "Create a reusable multi-select tag that can be applied from archive details.",
      editTag: "Edit tag",
      editTagDescription:
        "Update the tag name, slug, color, and active state here.",
      saveTag: "Save tag",
      saving: "Saving...",
      cancel: "Cancel",
      edit: "Edit",
      disable: "Disable",
      disableCategoryConfirm:
        "This category will no longer appear in selection lists after disabling. Continue?",
      disableTagConfirm:
        "This tag will no longer appear in selection lists after disabling. Continue?",
      statusActive: "Active",
      statusInactive: "Disabled",
      systemBadge: "System",
      customBadge: "Custom",
      noColor: "No color",
      noCategoryDescription: "No category description yet.",
      emptyCategories: "No categories yet. Create the first primary category.",
      emptyTags: "No tags yet. Create the first reusable tag.",
      summary: {
        totalCategories: "Total categories",
        activeCategories: "Active categories",
        totalTags: "Total tags",
        activeTags: "Active tags",
      },
      form: {
        nameLabel: "Name",
        slugLabel: "Slug",
        descriptionLabel: "Description",
        colorLabel: "Color",
        sortOrderLabel: "Sort order",
        statusLabel: "Status",
        categoryNamePlaceholder: "For example AI Watch",
        categoryDescriptionPlaceholder:
          "Describe which archived posts belong to this category",
        tagNamePlaceholder: "For example OpenAI",
        slugPlaceholder: "Leave blank to generate from the name",
        colorPlaceholder: "For example #2563eb",
      },
    },
    ai: {
      eyebrow: "AI Settings",
      title: "AI models",
      description:
        "Manage AI providers, model parameters, and task-level defaults in one place so classification, reports, and draft rewriting can share the same runtime foundation.",
      badge: "{count} model configs",
      errorTitle: "AI settings are temporarily unavailable",
      errorDescription:
        "Failed to load AI provider or model data. Please try again later.",
      summary: {
        providerCount: "Providers",
        enabledProviders: "Enabled providers",
        modelCount: "Models",
        defaultTasks: "Task defaults",
        totalCalls: "Calls (30d)",
        successRate: "Success rate",
        totalTokens: "Total tokens",
        totalCost: "Estimated cost",
      },
      usageTitle: "Usage and cost controls",
      usageDescription:
        "Aggregates AI traffic, token consumption, estimated cost, and remaining rate-limit headroom for the last {days} days.",
      usageErrorDescription:
        "AI usage analytics are temporarily unavailable, but provider and model settings can still be managed.",
      usageEmptyTitle: "No AI usage yet",
      usageEmptyDescription:
        "Run a provider test or an actual AI task first, then usage, token, and cost analytics will appear here.",
      windowLimitTitle: "Window rate limit",
      windowLimitDescription:
        "{calls} / {limit} requests used within the current {seconds}-second window.",
      windowRemainingDescription:
        "{count} requests remain in the current window.",
      dailyBudgetTitle: "Daily token budget",
      dailyBudgetDescription: "{used} / {limit} tokens used today.",
      dailyBudgetRemainingDescription: "{count} tokens remain today.",
      taskBreakdownTitle: "By task type",
      providerBreakdownTitle: "By provider",
      breakdownMeta: "{calls} calls · {tokens} tokens · {cost}",
      breakdownEmpty: "No aggregated usage details are available yet.",
      auditTitle: "Recent audit trail",
      auditDescription:
        "Every AI gateway call records its task type, model, token usage, estimated cost, and error state for later troubleshooting.",
      auditEmptyTitle: "No audit records yet",
      auditEmptyDescription:
        "After you test a provider or run an AI task, the most recent calls will appear here.",
      auditNoProvider: "No provider linked",
      auditNoModel: "No model linked",
      auditTaskHeader: "Task and status",
      auditModelHeader: "Model and provider",
      auditTargetLabel: "Target",
      auditUsageHeader: "Tokens and cost",
      auditTimeHeader: "Timing",
      auditErrorHeader: "Failure details",
      auditTokensLabel: "Tokens",
      auditCostLabel: "Cost",
      rateLimitedBadge: "Rate limited",
      providersTitle: "Provider configs",
      providersDescription:
        "Store API keys, Base URLs, and provider types. Connectivity tests use the provider's default model or first available model.",
      createProvider: "New provider",
      editProvider: "Edit provider",
      createProviderDescription:
        "Add a provider that can be called by the AI gateway. Secrets are encrypted on the backend.",
      editProviderDescription:
        "Update the provider name, Base URL, API key, or enabled state. Leave API key blank to keep the current value.",
      saveProvider: "Save provider",
      createModel: "New model",
      editModel: "Edit model",
      createModelDescription:
        "Add a model code, display name, default parameters, and task default selection.",
      editModelDescription:
        "Update the model code, task type, default parameters, enabled state, or switch the task default.",
      saveModel: "Save model",
      testingProvider: "Testing...",
      testProvider: "Test connection",
      testWithDefaultModel: "Test with default / first model",
      testRequiresModel:
        "Add at least one model under this provider before running a connection test.",
      setAsDefault: "Set default",
      defaultBadge: "Default",
      enabledBadge: "Enabled",
      disabledBadge: "Disabled",
      noBaseUrl: "Use provider default endpoint",
      noParameters: "No default parameters",
      providersEmptyTitle: "No AI providers yet",
      providersEmptyDescription:
        "Create a provider first, then configure models for classification, reports, and rewriting.",
      modelsTitle: "Model configs",
      modelsDescription:
        "Maintain task-specific model pools and choose defaults for post classification, report summarization, and draft rewriting.",
      modelsEmptyTitle: "No model configs yet",
      modelsEmptyDescription:
        "Add a provider first, then create models and assign task defaults.",
      providerTypeLabel: "Provider type",
      baseUrlLabel: "Base URL",
      apiKeyLabel: "API key",
      apiKeyHint: "Leave blank during editing to keep the current key.",
      providerNameLabel: "Provider name",
      modelCodeLabel: "Model code",
      modelDisplayNameLabel: "Display name",
      inputTokenPriceLabel: "Input token price (USD / 1K)",
      outputTokenPriceLabel: "Output token price (USD / 1K)",
      tokenPriceHint:
        "Optional pricing used for cost estimation. Leave blank to record token usage without converting to USD.",
      tokenPriceValue: "{value} / 1K",
      noTokenPrice: "Not configured",
      taskTypeLabel: "Task type",
      parametersLabel: "Default parameters JSON",
      parametersHint:
        'Provide a JSON object such as `{ "temperature": 0.2, "max_tokens": 1024 }`.',
      enabledLabel: "Enabled",
      defaultLabel: "Default task model",
      hasApiKey: "Secret saved",
      missingApiKey: "No secret saved",
      modelCountLabel: "{count} models",
      edit: "Edit",
      form: {
        providerNamePlaceholder: "For example OpenAI Production",
        baseUrlPlaceholder: "For example https://openrouter.ai/api/v1",
        apiKeyPlaceholder: "Enter API key",
        modelCodePlaceholder: "For example gpt-5.2 or claude-3-7-sonnet-latest",
        modelDisplayNamePlaceholder: "For example GPT-5.2 classifier",
        parametersPlaceholder:
          '{\n  "temperature": 0.2,\n  "max_tokens": 1024\n}',
        providerSelectPlaceholder: "Select a provider",
      },
    },
    archives: {
      eyebrow: "Archive",
      title: "Archives",
      description:
        "Archived recommended posts are shown here as cards, with pagination, source links, and detail pages.",
      filterTitle: "Filter archives",
      filterDescription:
        "Narrow results quickly by keyword, post type, and date range. Filters always reset back to the first page.",
      keywordPlaceholder: "Search body, author, binding account, or post ID",
      allTypes: "All types",
      applyFilters: "Apply filters",
      clearFilters: "Clear",
      keywordBadge: "Keyword: {keyword}",
      typeBadge: "Type: {postType}",
      dateBadge: "Date: {dateFrom} - {dateTo}",
      errorTitle: "Failed to load archives",
      errorAction: "Check bindings first",
      emptyFilteredTitle: "No archives match the current filters",
      emptyFilteredDescription:
        "Try a broader keyword, another type, or a different date range, then search again.",
      emptyTitle: "No archived content yet",
      emptyDescription:
        "Finish binding on the bindings page and trigger a crawl once. The system will then archive recommended posts here.",
      emptyFilteredAction: "Clear filters",
      emptyAction: "Trigger a crawl",
      sourceBinding: "Source binding",
      sourceCreatedAt: "Original post time",
      media: "Media",
      archiveId: "Archive ID",
      mediaIncluded: "Contains media",
      textOnly: "Text post",
    },
    archiveDetail: {
      eyebrow: "Archive detail",
      titleFallback: "Archive detail",
      descriptionReady:
        "This page shows the archived rich text body, media assets, source links, and surrounding archive context.",
      descriptionLoading: "Archive details are loading.",
      openOriginal: "Open original post",
      errorTitle: "Archive detail is temporarily unavailable",
      errorAction: "Back to archives",
      archivedAt: "Archived",
      sourceBinding: "Source binding",
      sourceCreatedAt: "Original post time",
      metrics: {
        replies: "Replies",
        reposts: "Reposts",
        quotes: "Quotes",
        likesViews: "Likes / Views",
      },
      sourceContextTitle: "Source and context",
      sourceContextDescription:
        "This section keeps the original post link, source binding, and first archive run for easy tracing.",
      originalPost: "Original post",
      binding: "Binding",
      firstRun: "First crawl run",
      viewRun: "View this run",
      mediaTitle: "Media and relations",
      mediaDescription:
        "This section keeps media entry links and relation references. Images and videos are displayed directly in the post body.",
      mediaInlineHint:
        "Media previews are shown in the post body. This panel keeps the resource entry.",
      noMediaTitle: "This archive has no media",
      noMediaDescription:
        "The current post contains only text, so no image or video blocks appear in the rich text body.",
      openRelatedPost: "Open related post",
      targetAuthor: "Target author: @{username}",
      taxonomyTitle: "Category and tags",
      taxonomyDescription:
        "Manage the primary category and shared tag set for this archive. AI-generated tags and manual edits both converge into the same editable result.",
      currentCategoryLabel: "Current primary category",
      currentTagsLabel: "Current tags",
      noPrimaryCategory: "No primary category set",
      noTags: "No tags yet",
      primaryCategoryLabel: "Primary category",
      chooseCategory: "No primary category",
      tagsFieldLabel: "Tag selection",
      chooseTags: "Choose tags",
      tagPickerHint: "Expand to search and multi-select tags",
      selectedTagsCount: "{count} tags selected",
      searchTagsPlaceholder: "Search tags",
      noMatchingTags: "No matching tags",
      taxonomyEditorHint:
        "You are editing the final tag set for this archive. Tags created by AI appear in the same shared pool and can be changed or removed here.",
      lockBadge: "Locked",
      noTagOptions:
        "No tag options are available yet. Create tags from the taxonomy page first.",
      taxonomyLockHint:
        "After saving, the current category and tag set become locked so later AI reruns will not overwrite them by default until you edit them again.",
      taxonomyLoadError: "Failed to load taxonomy options.",
      saveTaxonomy: "Save category and tags",
      saveTaxonomyPending: "Saving category and tags...",
    },
    runs: {
      eyebrow: "Task history",
      title: "Runs",
      description:
        "Runs are displayed in reverse chronological order so you can review trigger type, counts, failure causes, and details.",
      errorTitle: "Failed to load run history",
      errorAction: "Back to bindings",
      emptyTitle: "No runs yet",
      emptyDescription:
        "Finish the account setup on the bindings page and trigger a crawl once. Execution history will start accumulating here.",
      emptyAction: "Trigger a crawl",
      createdAt: "Created",
      bindingAccount: "Binding account",
      startedAt: "Started",
      finishedAt: "Finished",
      fetched: "Fetched",
      newCount: "New",
      skipped: "Skipped",
      failed: "Failed",
      errorSummary: "Error summary",
      noErrorSummary: "This run has no error summary",
      backToBindings: "Back to bindings",
    },
    reports: {
      eyebrow: "Report center",
      title: "Reports",
      description:
        "Aggregate archived posts by time period, generate weekly or monthly AI reports, and manage review plus publishing prep from one place.",
      badge: "{count} reports",
      generateTitle: "Generate a new report",
      generateDescription:
        "Choose a reporting period and filters, then let the system build a structured AI draft from archived posts.",
      generateBadge: "AI Summary",
      generateAction: "Generate report",
      generating: "Generating...",
      filterTitle: "Filters",
      filterDescription:
        "Use bindings, crawl modes, categories, and tags to define the report scope, then filter historical reports by period and status.",
      noBindingsHint: "No bound accounts are available for aggregation yet.",
      noCategoriesHint: "There are no active categories available for filtering.",
      noTagsHint: "There are no active tags available for filtering.",
      allReportTypes: "All periods",
      allStatuses: "All statuses",
      applyFilters: "Apply filters",
      clearFilters: "Clear filters",
      errorTitle: "Report list is temporarily unavailable",
      emptyTitle: "No reports yet",
      emptyDescription:
        "Generate your first weekly or monthly report to store AI-generated titles, summaries, and body content here.",
      emptyAction: "Generate a report",
      createdAtLabel: "Created",
      updatedAtLabel: "Updated",
      periodLabel: "Reporting period",
      sourcePostsLabel: "Source posts",
      reportIdLabel: "Report ID",
      summaryLabel: "Summary",
      noSummary: "No summary is available for this report yet.",
      viewDetail: "View details",
      form: {
        reportTypeLabel: "Report period",
        statusLabel: "Report status",
        periodStartLabel: "Start date",
        periodEndLabel: "End date",
        bindingFilterLabel: "Bound accounts",
        modeFilterLabel: "Crawl modes",
        categoryFilterLabel: "Categories",
        tagFilterLabel: "Tags",
      },
    },
    reportDetail: {
      eyebrow: "Report detail",
      titleFallback: "Report detail",
      descriptionReady:
        "This page shows the AI-generated report body, source posts, context metadata, and manual editing tools.",
      descriptionLoading: "Report details are loading.",
      errorTitle: "Report detail is temporarily unavailable",
      errorAction: "Back to reports",
      periodLabel: "Reporting period",
      createdAtLabel: "Created",
      updatedAtLabel: "Updated",
      summaryTitle: "Report summary",
      noSummary: "No summary is available for this report.",
      sourcePostsTitle: "Source posts",
      sourcePostsDescription:
        "These archived posts were used for report aggregation. You can continue into archive details or open the original source posts.",
      sourcePostLabel: "Source post",
      viewArchive: "View archive",
      openSourcePost: "View source post",
      emptySourcePostsTitle: "This report has no linked source posts",
      emptySourcePostsDescription:
        "The source list may be empty for failed generations or after related data has been cleaned up.",
      contextTitle: "Report context",
      contextDescription:
        "Review the reporting period, source-post count, and creation timestamps to judge how fresh this report is.",
      sourcePostsCountLabel: "Source post count",
      sourcePostsCount: "{count} posts",
      editorTitle: "Manual editing",
      editorDescription:
        "Adjust the AI-generated title and body here, then save the refined version back into the current report.",
      titleLabel: "Report title",
      bodyLabel: "Report body",
      bodyPlaceholder: "Edit or expand the report body here.",
      bodyHint:
        "The current editor accepts plain text. It will be converted into the platform rich-text document format when saved.",
      save: "Save changes",
      saving: "Saving...",
      regenerateTitle: "Regenerate",
      regenerateDescription:
        "Reuse the original report period and filters to call AI again. This is helpful after changing models or refreshing archived data.",
      regenerate: "Regenerate report",
      regenerating: "Regenerating...",
      publishTitle: "Publishing draft",
      publishDescription:
        "This panel is reserved for the next publishing workflow that turns reports into channel-ready drafts.",
      publishPendingHint:
        "The current version focuses on viewing, editing, and regenerating reports. Publishing drafts and multi-channel delivery will be implemented in later TODO items.",
      publishAction: "Create publishing draft",
    },
    runDetail: {
      eyebrow: "Run detail",
      titleFallback: "Run detail",
      title: "Run {id}",
      descriptionReady:
        "This page shows one crawl execution, including status, counts, error info, and the handling result for each post.",
      descriptionLoading: "Run details are loading.",
      viewBinding: "View binding",
      errorTitle: "Run detail is temporarily unavailable",
      errorAction: "Back to runs",
      createdAt: "Created",
      bindingAccount: "Binding account",
      startedAt: "Started",
      finishedAt: "Finished",
      fetched: "Fetched",
      archived: "Archived",
      skipped: "Skipped",
      failed: "Failed",
      runItemsTitle: "Handled items",
      runItemsDescription:
        "Each recommended post leaves a `CREATED`, `SKIPPED`, or `FAILED` result here.",
      recordTime: "Recorded at",
      viewArchive: "View archive",
      noArchiveEntity: "This item has no archive entity",
      emptyTitle: "No handled items yet",
      emptyDescription:
        "If the task is still queued or running, items will keep being written as the archive flow continues.",
      contextTitle: "Execution context",
      contextDescription:
        "Used to confirm which binding and scheduler job this run belongs to, together with current scheduler settings.",
      binding: "Binding",
      crawlJob: "Crawl job",
      crawlJobEnabled: "Enabled",
      crawlJobDisabled: "Disabled",
      nextRun: "Next run",
      errorInfoTitle: "Error information",
      errorInfoDescription:
        "If the run failed completely or partially, this section shows the summary and structured error detail.",
      errorSummary: "Error summary",
      noErrorSummary: "This run has no error summary",
      noErrorDetail: "There is no structured `errorDetail` data for this run.",
    },
    enums: {
      bindingStatus: {
        ACTIVE: "Active",
        INVALID: "Invalid",
        DISABLED: "Disabled",
        PENDING: "Pending",
        UNBOUND: "Unbound",
      },
      runStatus: {
        QUEUED: "Queued",
        RUNNING: "Running",
        SUCCESS: "Success",
        PARTIAL_FAILED: "Partially failed",
        FAILED: "Failed",
        CANCELLED: "Cancelled",
        NO_RUN: "No runs",
      },
      triggerType: {
        MANUAL: "Manual",
        SCHEDULED: "Scheduled",
        RETRY: "Retry",
      },
      crawlMode: {
        RECOMMENDED: "Recommended",
        HOT: "Hot",
        SEARCH: "Search",
      },
      postType: {
        POST: "Post",
        REPOST: "Repost",
        QUOTE: "Quote",
        REPLY: "Reply",
      },
      credentialSource: {
        WEB_LOGIN: "Web login",
        COOKIE_IMPORT: "Cookie import",
        EXTENSION: "Extension capture",
      },
      browserSessionStatus: {
        PENDING: "Launching browser",
        WAITING_LOGIN: "Waiting for X login",
        SUCCESS: "Bound successfully",
        FAILED: "Binding failed",
        EXPIRED: "Session expired",
        CANCELLED: "Session cancelled",
      },
      actionType: {
        CREATED: "Created",
        SKIPPED: "Skipped",
        FAILED: "Failed",
      },
      relationType: {
        QUOTE: "Quote",
        REPOST: "Repost",
        REPLY: "Reply",
      },
      taxonomySource: {
        MANUAL: "Manual",
        AI: "AI",
        RULE: "Rule",
      },
      aiProviderType: {
        OPENAI: "OpenAI",
        ANTHROPIC: "Anthropic",
        GEMINI: "Gemini",
        OPENAI_COMPATIBLE: "OpenAI Compatible",
      },
      aiTaskType: {
        POST_CLASSIFY: "Post classification",
        REPORT_SUMMARY: "Report summary",
        DRAFT_REWRITE: "Draft rewrite",
      },
      aiTaskStatus: {
        PENDING: "Pending",
        RUNNING: "Running",
        SUCCESS: "Success",
        FAILED: "Failed",
        CANCELLED: "Cancelled",
      },
      reportType: {
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
      },
      reportStatus: {
        DRAFT: "Draft",
        READY: "Ready",
        FAILED: "Failed",
      },
    },
    actions: {
      login: {
        invalidEmail: "Please enter a valid email address.",
        invalidPassword: "Password must be at least 8 characters.",
        invalidInput: "The login form data is invalid.",
        invalidCredentials: "Incorrect email or password. Please try again.",
        failed: "Sign-in failed. Please try again later.",
      },
      bindings: {
        missingXUserId: "Please enter the X user ID.",
        missingUsername: "Please enter the X username.",
        invalidAvatarUrl: "Avatar URL must be a valid URL.",
        missingCredentialPayload: "Please paste crawl credentials.",
        missingCrawlInterval: "Please enter a crawl interval.",
        invalidCrawlIntervalInt: "The crawl interval must be an integer.",
        invalidCrawlIntervalMin:
          "The crawl interval must be at least 5 minutes.",
        invalidCrawlIntervalMax:
          "The crawl interval cannot exceed 1440 minutes.",
        missingMaxPosts: "Please enter a max-post limit.",
        invalidMaxPostsInt: "The max-post limit must be an integer.",
        invalidMaxPostsMin: "The max-post limit must be at least 1.",
        invalidMaxPostsMax: "The max-post limit cannot exceed 200.",
        missingBindingId: "Missing binding ID.",
        missingProfileId: "Missing crawl profile ID.",
        missingQueryText: "Search mode requires a query text.",
        missingScheduleCron: "Cron schedules require an expression.",
        bindingValidationFailed: "Binding form validation failed.",
        profileValidationFailed: "Crawl profile validation failed.",
        bindingSaved: "Binding information has been saved.",
        profileCreated: "Crawl profile has been created.",
        profileUpdated: "Crawl profile has been updated.",
        profileDeleted: "Crawl profile has been deleted.",
        configValidationFailed: "Crawl config validation failed.",
        configSaved: "Crawl config has been updated.",
        bindingRevalidated: "Binding status has been revalidated.",
        bindingDisabled: "Binding has been disabled.",
        bindingUnbound:
          "Binding removed. Deleted {deletedArchiveCount} archived posts and {deletedRunCount} crawl runs.",
        viewCurrentRun: "View current crawl run",
        viewTriggeredRun: "View this crawl run",
        manualCrawlTriggered:
          "Manual crawl was triggered. Current status: {status} ({triggerType}).",
        profileManualTriggered:
          "Profile run was triggered. Current status: {status} ({triggerType}).",
      },
      archives: {
        missingArchiveId: "Missing archive ID.",
        taxonomyUpdated: "Manual category and tags have been saved.",
        taxonomyValidationFailed:
          "Archive taxonomy validation failed. Please check the form.",
      },
      taxonomy: {
        missingName: "Please enter a name.",
        invalidColor: "Color must be a valid hexadecimal value.",
        invalidSortOrder: "Sort order must be an integer.",
        missingCategoryId: "Missing category ID.",
        missingTagId: "Missing tag ID.",
        categoryValidationFailed: "Category form validation failed.",
        categoryCreated: "Category created.",
        categoryUpdated: "Category updated.",
        categoryDisabled: "Category disabled.",
        tagValidationFailed: "Tag form validation failed.",
        tagCreated: "Tag created.",
        tagUpdated: "Tag updated.",
        tagDisabled: "Tag disabled.",
      },
      ai: {
        missingProviderId: "Missing provider ID.",
        missingProviderName: "Please enter the provider name.",
        missingProviderType: "Please select a provider type.",
        missingApiKey: "Please enter the API key.",
        missingModelId: "Missing model ID.",
        missingProviderConfigId: "Please select a provider.",
        missingModelCode: "Please enter the model code.",
        missingDisplayName: "Please enter the model display name.",
        missingTaskType: "Please select a task type.",
        invalidParametersJson:
          "Default parameters must be a valid JSON object.",
        invalidTokenPrice:
          "Token pricing must be a number greater than or equal to 0.",
        defaultModelRequiresEnabled: "A default model must remain enabled.",
        providerValidationFailed: "AI provider form validation failed.",
        providerCreated: "AI provider created.",
        providerUpdated: "AI provider updated.",
        modelValidationFailed: "AI model form validation failed.",
        modelCreated: "AI model created.",
        modelUpdated: "AI model updated.",
        modelDefaultUpdated: "Default task model updated.",
        providerTested:
          "Connection test succeeded. Model {model} replied with: {text}",
      },
      reports: {
        missingReportType: "Please choose a report period.",
        missingPeriodStart: "Please choose the report start date.",
        missingPeriodEnd: "Please choose the report end date.",
        invalidPeriodRange: "The end date cannot be earlier than the start date.",
        missingReportId: "Missing report ID.",
        missingReportTitle: "Please enter the report title.",
        missingBodyText: "Please enter the report body.",
        generateValidationFailed: "Report generation validation failed.",
        updateValidationFailed: "Report update validation failed.",
        regenerateValidationFailed: "Report regeneration validation failed.",
        reportUpdated: "Report content has been saved.",
        reportRegenerated: "Report has been regenerated.",
      },
      api: {
        unauthorized: "Not signed in or the session has expired.",
        requestFailed: "The request failed. Please try again later.",
      },
    },
  },
};

export function getMessages(locale: Locale) {
  return messages[locale];
}
