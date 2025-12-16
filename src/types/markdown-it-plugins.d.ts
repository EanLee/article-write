// Type declarations for markdown-it plugins

declare module 'markdown-it-table-of-contents' {
  import { PluginSimple } from 'markdown-it'
  
  interface _TocOptions {
    includeLevel?: number[]
    containerClass?: string
    markerPattern?: RegExp
  }
  
  const plugin: PluginSimple
  export = plugin
}

declare module 'markdown-it-task-lists' {
  import { PluginSimple } from 'markdown-it'
  
  interface _TaskListOptions {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }
  
  const plugin: PluginSimple
  export = plugin
}

declare module 'markdown-it-mark' {
  import { PluginSimple } from 'markdown-it'
  
  const plugin: PluginSimple
  export = plugin
}

declare module 'markdown-it-footnote' {
  import { PluginSimple } from 'markdown-it'
  
  const plugin: PluginSimple
  export = plugin
}