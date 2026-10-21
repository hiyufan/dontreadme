# Records docs/demo.gif. Needs vhs (github.com/charmbracelet/vhs); run from the repository root:
#   npm run build && vhs docs/demo.tape
Output docs/demo.gif

Set Shell bash
Set FontSize 14
Set Width 1440
Set Height 600
Set Padding 20
Set Theme "Dracula"
Set TypingSpeed 45ms

Hide
Type "export PS1='$ ' DONTREADME_LANG=en; alias dontreadme='node scripts/cli.js'; clear"
Enter
Show

Type "dontreadme examples/slop.md"
Sleep 400ms
Enter
Sleep 4s

Type "clear; dontreadme README.md"
Sleep 400ms
Enter
Sleep 3s
