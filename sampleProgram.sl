function getNumerLen(number) {
    let len = 0
    while(number > 0) {
        len += 1
        number = floor(number / 10)
    }
    return len
}

function rightPadding(number, len) {
    let res = number
    let numberLen = getNumerLen(number)
    for(let i = 0; i < len - numberLen; i += 1) res += " "
    return res
}

function bar(count) {
    let line = rightPadding(count, 3) + ": "
    for(let i = 0; i < count; i += 1) {
        line += "#"
    }
    return line
}

for(let i = 1; i < 13; i += 1) {
    print(bar(i * i))
}
