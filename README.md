# Tavern Translator Skill

这个仓库已经从原来的 Web 翻译项目收敛为 Codex skill 参考包。

## 更新说明

- 已删除前端、后端服务、Docker、测试和部署脚本
- 保留 `SKILL.md` 作为 skill 入口
- 保留 `references/` 作为 PNG 处理、翻译规则和文件命名参考

## 安装到 Codex

把这个 skill 复制到 Codex 的 skills 目录下即可：

```bash
mkdir -p "$HOME/.codex/skills/tavern-translator"
cp /Volumes/app/DevelopProject/tavernTranslator/SKILL.md "$HOME/.codex/skills/tavern-translator/"
cp -R /Volumes/app/DevelopProject/tavernTranslator/references "$HOME/.codex/skills/tavern-translator/"
```

复制完成后，重新打开一个新的 Codex 会话，skill 就会被加载。

## 使用方式

在新会话里直接描述任务即可，例如：

- 翻译一张 SillyTavern 角色卡为中文并回写 PNG
- 提取 PNG 里的角色卡 JSON
- 按 glossary 规则翻译角色设定

## 说明

- `SKILL.md` 定义了 skill 的触发条件和流程
- `references/png-processing.md` 说明 PNG 角色卡的提取与回写规则
- `references/translation-rules.md` 说明字段映射和翻译约束
- `references/file-naming.md` 说明输出文件命名与去重逻辑
