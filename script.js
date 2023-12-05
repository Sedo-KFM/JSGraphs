window.onload = () => main()

function main() {
    let mainContainer = document.getElementById("main-container");
    let calculator = new Calculator();
    let intelliSense = new InteliSense();
    let leftPanel = document.getElementById("left-panel");
    let stepSlider = document.getElementById("step-slider");
    let stepSliderHeaderValue = document.getElementById("step-slider-header-value");
    let hideButton = document.getElementById("hide-btn");
    let splitter = document.getElementById("splitter");
    calculator.grid.print();

    mainContainer.addEventListener("mousedown", (event) => {
        calculator.grid.mouseTracker.pressed = true;
        calculator.grid.mouseTracker.mousePrevX = event.x;
        calculator.grid.mouseTracker.mousePrevY = event.y;
    })

    mainContainer.addEventListener("mouseup", () => {
        calculator.grid.mouseTracker.pressed = false;
    })

    mainContainer.addEventListener("mousemove", (event) => {
        if (calculator.grid.mouseTracker.pressed) {
            calculator.grid.center = {
                x: calculator.grid.center.x - calculator.grid.mouseTracker.mousePrevX + event.x,
                y: calculator.grid.center.y - calculator.grid.mouseTracker.mousePrevY + event.y
            }
            calculator.grid.mouseTracker.mousePrevX = event.x;
            calculator.grid.mouseTracker.mousePrevY = event.y;
            calculator.reflect();
        }
    });

    mainContainer.addEventListener("wheel", (event) => {
        let zoomIn = event.deltaY > 0;
        let wheelValue = 1 + Math.abs(event.deltaY) / 1000 + 0.02;
        if (zoomIn) wheelValue = 1 / wheelValue;
        if (wheelValue !== 0) {
            let beforeV = calculator.grid.r2v({ x: event.x, y: event.y });
            let newScale = calculator.grid.scale * wheelValue;
            if (newScale / 50 < calculator.grid.scaleLimits.min || calculator.grid.scaleLimits.max < newScale / 50) return;
            calculator.grid.scale = newScale;
            let afterV = calculator.grid.r2v({ x: event.x, y: event.y });
            let shiftV = { x: afterV.x - beforeV.x, y: afterV.y - beforeV.y };
            calculator.grid.center.x += calculator.grid.v2r(shiftV.x);
            calculator.grid.center.y -= calculator.grid.v2r(shiftV.y);
            calculator.reflect();
        }
    });

    stepSlider.addEventListener("input", (event) => {
        let pointOnPixel = (Math.pow(1.0476158, stepSlider.value - 1) - 1) / 99 * 99.9 + 1 - 0.9 + 0.000000001;
        let letters = pointOnPixel < 1 ? 5 : 4
        let output = pointOnPixel.toString().slice(0, letters);
        output = output.slice(0, output.search(/\.?0*$/));
        stepSliderHeaderValue.innerText = output;
        calculator.step = 1 / pointOnPixel;
        calculator.reflect();
    })

    let buttonSvgPath = {
        target: document.getElementById("button-svg-path"),
        close: "M13.5,7.5H7.7l2.1-2.1c0.2-0.2,0.2-0.5,0-0.7s-0.5-0.2-0.7,0l-3,3c0,0,0,0,0,0C6,7.8,6,8.2,6.1,8.4l3,3c0.2,0.2,0.5,0.2,0.7,0s0.2-0.5,0-0.7L7.7,8.5h5.8C13.8,8.5,14,8.3,14,8C14,7.7,13.8,7.5,13.5,7.5z M3.5,15C3.2,15,3,14.8,3,14.5v-13C3,1.2,3.2,1,3.5,1S4,1.2,4,1.5v13C4,14.8,3.8,15,3.5,15z",
        open: "M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5z"
    }

    hideButton.addEventListener("click", () => {
        if (leftPanel.classList.contains("hidden")) {
            leftPanel.classList.remove("hidden");
            hideButton.style.left = 0;
            leftPanel.style.left = 0;
            splitter.style.left = 0;
            buttonSvgPath.target.setAttribute("d", buttonSvgPath.close);
        } else {
            leftPanel.classList.add("hidden");
            hideButton.style.left = -hideButton.getBoundingClientRect().left + 6 + "px";
            leftPanel.style.left = -hideButton.getBoundingClientRect().left + 6 + "px";
            splitter.style.left = -hideButton.getBoundingClientRect().left + 6 + "px";
            buttonSvgPath.target.setAttribute("d", buttonSvgPath.open);
        }
    });

    splitter.addEventListener("mousedown", () => {
        splitter.dragged = true;
        document.body.style.cursor = "e-resize"
    });

    window.addEventListener("mousemove", (event) => {
        if (splitter.dragged) {
            if (event.x < 200) return;
            leftPanel.style.width = event.x + "px";
            splitter.style.marginLeft = event.x - 5 + "px";
            hideButton.style.marginLeft = event.x + 12 + "px";
        }
    })

    window.addEventListener("mouseup", () => {
        if (splitter.dragged) {
            splitter.dragged = false;
            document.body.style.cursor = "default";
        }
    });

    let onFormulaInput = (event) => {
        let fun = parseFun(event.target.value, intelliSense.suggestions);
        let index = event.target.getAttribute("index");
        calculator.funs[index] = fun;
        calculator.reflect(index);
    }

    let onDeleteButtonClick = (event) => {
        let target = event.target
        let index = target.getAttribute("index");
        while (!index) {
            target = target.parentElement;
            index = target.getAttribute("index");
        }
        document.getElementById("input-container").removeChild(document.getElementById("input-line-" + index));
        calculator.removeFun(index);
        splitter.style.height = leftPanel.getBoundingClientRect().height - 25 + "px";
    }

    let onColorpickerChange = (event) => {
        let index = event.target.getAttribute("index");
        calculator.vColors[index] = event.target.value;
        calculator.reflect(index);
    }

    let onFocusInAndInput = (event) => {
        let clearInput = intelliSense.clearInput(event.target.value);
        let intelliSenseBox = intelliSense.generate(clearInput);
        intelliSenseBox.style.top = event.target.getBoundingClientRect().top + 50 + "px";
        if (intelliSense.currentIntelliSenseBox !== null) {
            replaceContent(intelliSenseBox, intelliSense.currentIntelliSenseBox);
        } else {
            intelliSense.currentIntelliSenseBox = intelliSenseBox;
            document.body.appendChild(intelliSenseBox);
        }
    }

    let onFocusOut = (event) => {
        let intelliSenseBox = intelliSense.currentIntelliSenseBox;
        if (intelliSenseBox !== null) {
            document.body.removeChild(intelliSenseBox);
            intelliSense.currentIntelliSenseBox = null;
        }
    }

    let buildNewInputLine = (index) => {
        let inputLine = document.createElement("div");
        inputLine.id = "input-line-" + index;
        inputLine.className = "input-line";
        let inputGroup = document.createElement("div");
        inputGroup.className = "input-group";
        let formulaInput = document.createElement("input");
        formulaInput.className = "form-control formula-input";
        formulaInput.setAttribute("index", index);
        formulaInput.addEventListener("input", onFormulaInput);
        formulaInput.addEventListener("input", onFocusInAndInput);
        formulaInput.addEventListener("focusin", onFocusInAndInput);
        formulaInput.addEventListener("focusout", onFocusOut);
        let deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-outline-danger";
        deleteButton.setAttribute("index", index);
        deleteButton.addEventListener("click", onDeleteButtonClick);
        let svgHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-trash" viewBox="0 0 18 18"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>';
        let colorpicker = document.createElement("input");
        colorpicker.className = "colorpicker";
        colorpicker.setAttribute("type", "color");
        colorpicker.setAttribute("index", index);
        colorpicker.addEventListener("change", onColorpickerChange);

        deleteButton.innerHTML = svgHtml;
        inputGroup.appendChild(formulaInput);
        inputGroup.appendChild(deleteButton);
        inputLine.appendChild(inputGroup);
        inputLine.appendChild(colorpicker);

        return inputLine;
    }

    let onClickAddBtn = () => {
        let index = calculator.addFun();
        let newInputLine = buildNewInputLine(index);
        inputContainer.appendChild(newInputLine);
        splitter.style.height = leftPanel.getBoundingClientRect().height - 25 + "px";
    }

    let inputContainer = document.getElementById("input-container");
    let addBtn = document.getElementById("add-btn");
    addBtn.addEventListener("click", onClickAddBtn);

    onClickAddBtn();
}

function replaceContent(from, to) {
    Array.from(to.children).forEach((child) => to.removeChild(child));
    Array.from(from.children).forEach((child) => to.appendChild(child));
}

function hexToRgbA(hex, alpha) {
    var c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = "0x" + c.join("");
        return "rgba(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + "," + alpha + ")";
    }
    throw new Error("Bad Hex");
}

function parseFun(funStr, suggestions) {
    try {
        if (funStr[0] === ">") return Function("x", funStr.slice(1));
    } catch { }
    let maths = Array.from(funStr.matchAll(/[a-zA-Z][a-zA-Z0-9_]*/g));
    for (let i = maths.length - 1; i >= 0; i--) {
        let isExistsInMath = false;
        suggestions.forEach((suggestion) => {
            if (maths[i].toString() === suggestion.typeKey) isExistsInMath = true;
        })
        if (isExistsInMath) {
            funStr = funStr.slice(0, maths[i].index) + "Math." + funStr.slice(maths[i].index);
        }
    }
    try {
        return Function("x", "return " + funStr);
    } catch { }
}

function findClosest(value, arr) {
    let diff = Math.abs(value - arr[0]);
    for (let i = 1; i < arr.length; i++) {
        let newDiff = Math.abs(value - arr[i]);
        if (newDiff > diff) return arr[i - 1];
        diff = newDiff;
    }
    return arr[arr.length - 1];
}

class Calculator {
    viewsContainer = document.getElementById("views-container");
    grid = new Grid();
    funs = [];
    views = [];
    vColors = [];
    step = 1;
    running = false;
    meanLatency = 0;

    addFun() {
        let index = null;
        for (let i = 0; i < this.funs.length; i++) {
            if (this.funs[i] === null) {
                index = i;
                this.funs[index] = "";
                break;
            }
        }
        if (index === null) {
            index = this.funs.length;
            this.funs.push("");
            let newView = document.createElement("canvas");
            newView.className = "view";
            newView.width = this.grid.source.width;
            newView.height = this.grid.source.height;
            this.viewsContainer.appendChild(newView);
            this.views.push(newView);
            this.vColors.push("#000");
        }
        return index;
    }

    removeFun(index) {
        this.grid.virtualClear(this.views[index].getContext("2d"));
        this.funs[index] = null;
        this.vColors[index] = "#000000";
    }

    calc(index) {
        if (this.funs[index] === null || this.funs[index] === "") return;
        let context = this.views[index].getContext("2d");
        context.beginPath()
        let leftEdge = this.grid.getVLeftEdge();
        let rightEdge = this.grid.getVRightEdge();
        let topEdge = this.grid.getVTopEdge();
        let bottomEdge = this.grid.getVBottomEdge();
        let stepV = this.step / this.grid.scale;
        let y = this.funs[index](leftEdge);
        let outOfBounds = y < bottomEdge && topEdge < y
        if (!outOfBounds) this.grid.virtualMoveTo(context, leftEdge, this.funs[index](leftEdge));
        for (let x = leftEdge + stepV; x < rightEdge; x += stepV) {
            y = this.funs[index](x);
            if (bottomEdge <= y && y <= topEdge) {
                if (outOfBounds) {
                    outOfBounds = false;
                    let prev = this.funs[index](x - stepV);
                    if (isNaN(prev)) {
                        this.grid.virtualMoveTo(context, x, y);
                        continue;
                    }
                    this.grid.virtualMoveTo(context, x - stepV, this.funs[index](x - stepV));
                }
                this.grid.virtualLineTo(context, x, y);
            } else {
                if (!outOfBounds) {
                    if (!isNaN(y)) {
                        this.grid.virtualLineTo(context, x, y);
                    }
                    outOfBounds = true;
                }
            }
        }
        context.save();
        context.lineWidth = 2;
        context.strokeStyle = hexToRgbA(this.vColors[index], 0.8);
        context.stroke();
        context.restore();
    }

    reflect(index = -1) {
        if (!this.running) {
            this.running = true;
            this.underReflect(index);
            this.running = false;
        }
    }

    underReflect(index) {
        if (index === -1) {
            this.grid.print();
            for (let i = 0; i < this.views.length; i++) {
                this.underReflect(i);
            }
            return;
        }
        let context = this.views[index].getContext("2d");
        context.clearRect(0, 0, this.views[index].width, this.views[index].height);
        try {
            this.calc(index);
        } catch (exception) { }

    }
}

class InteliSense {
    currentIntelliSenseBox = null;
    suggestions = [
        { lowerTypeKey: "e", typeKey: "E", fullKey: "E", hint: "Число Эйлера" },
        { lowerTypeKey: "ln2", typeKey: "LN2", fullKey: "LN2", hint: "Натуральный логарифм из 2" },
        { lowerTypeKey: "ln10", typeKey: "LN10", fullKey: "LN10", hint: "Натуральный логарифм из 10" },
        { lowerTypeKey: "log2e", typeKey: "LOG2E", fullKey: "LOG2E", hint: "Двоичный логарифм из E" },
        { lowerTypeKey: "log10e", typeKey: "LOG10E", fullKey: "LOG10E", hint: "Десятичный логарифм из E" },
        { lowerTypeKey: "pi", typeKey: "PI", fullKey: "PI", hint: "Отношение длины окружности круга к его диаметру" },
        { lowerTypeKey: "sqrt1_2", typeKey: "SQRT1_2", fullKey: "SQRT1_2", hint: "Квадратный корень из 1/2" },
        { lowerTypeKey: "sqrt_2", typeKey: "SQRT_2", fullKey: "SQRT_2", hint: "Квадратный корень из 2" },
        { lowerTypeKey: "abs", typeKey: "abs", fullKey: "abs(x)", hint: "Абсолютное значение числа" },
        { lowerTypeKey: "acos", typeKey: "acos", fullKey: "acos(x)", hint: "Арккосинус числа" },
        { lowerTypeKey: "acosh", typeKey: "acosh", fullKey: "acosh(x)", hint: "Гиперболический арккосинус числа" },
        { lowerTypeKey: "asin", typeKey: "asin", fullKey: "asin(x)", hint: "Арксинус числа" },
        { lowerTypeKey: "asinh", typeKey: "asinh", fullKey: "asinh(x)", hint: "Гиперболический арксинус числа" },
        { lowerTypeKey: "atan", typeKey: "atan", fullKey: "atan(x)", hint: "Арктангенс числа" },
        { lowerTypeKey: "atanh", typeKey: "atanh", fullKey: "atanh(x)", hint: "Гиперболический арктангенс числа" },
        { lowerTypeKey: "atan2", typeKey: "atan2", fullKey: "atan2(y, x)", hint: "Арктангенс от частного своих аргументов" },
        { lowerTypeKey: "cbrt", typeKey: "cbrt", fullKey: "cbrt(x)", hint: "Кубический корень числа" },
        { lowerTypeKey: "ceil", typeKey: "ceil", fullKey: "ceil(x)", hint: "Значение числа, округлённое к большему целому" },
        { lowerTypeKey: "clz32", typeKey: "clz32", fullKey: "clz32(x)", hint: "Количество ведущих нулей 32-битного целого числа" },
        { lowerTypeKey: "cos", typeKey: "cos", fullKey: "cos(x)", hint: "Косинус числа" },
        { lowerTypeKey: "cosh", typeKey: "cosh", fullKey: "cosh(x)", hint: "Гиперболический косинус числа" },
        { lowerTypeKey: "exp", typeKey: "exp", fullKey: "exp(x)", hint: "Ex, где x — аргумент, а E — число Эйлера, основание натурального логарифма" },
        { lowerTypeKey: "expm1", typeKey: "expm1", fullKey: "expm1(x)", hint: "exp(x), из которого вычли единицу" },
        { lowerTypeKey: "floor", typeKey: "floor", fullKey: "floor(x)", hint: "Значение числа, округлённое к меньшему целому" },
        { lowerTypeKey: "fround", typeKey: "fround", fullKey: "fround(x)", hint: "Ближайшее число с плавающей запятой одинарной точности, представляющие это число" },
        { lowerTypeKey: "hypot", typeKey: "hypot", fullKey: "hypot(x1, x2, ...)", hint: "Квадратный корень из суммы квадратов своих аргументов" },
        { lowerTypeKey: "imul", typeKey: "imul", fullKey: "imul(x1, x2)", hint: "Результат умножения 32-битных целых чисел" },
        { lowerTypeKey: "log", typeKey: "log", fullKey: "log(x)", hint: "Натуральный логарифм числа" },
        { lowerTypeKey: "log1p", typeKey: "log1p", fullKey: "log1p(x)", hint: "Натуральный логарифм числа 1 + x" },
        { lowerTypeKey: "log10", typeKey: "log10", fullKey: "log10(x)", hint: "Десятичный логарифм числа" },
        { lowerTypeKey: "log2", typeKey: "log2", fullKey: "log2(x)", hint: "Двоичный логарифм числа" },
        { lowerTypeKey: "max", typeKey: "max", fullKey: "max([x1, x2, ...)", hint: "Наибольшее число из своих аргументов" },
        { lowerTypeKey: "min", typeKey: "min", fullKey: "min([x1, x2, ...)", hint: "Наименьшее число из своих аргументов" },
        { lowerTypeKey: "pow", typeKey: "pow", fullKey: "pow(x, a)", hint: "Основание в степени экспоненты" },
        { lowerTypeKey: "random", typeKey: "random", fullKey: "random()", hint: "Псевдослучайное число в диапазоне от 0 до 1" },
        { lowerTypeKey: "round", typeKey: "round", fullKey: "round(x)", hint: "Значение числа, округлённое до ближайшего целого" },
        { lowerTypeKey: "sin", typeKey: "sin", fullKey: "sin(x)", hint: "Синус числа" },
        { lowerTypeKey: "sinh", typeKey: "sinh", fullKey: "sinh(x)", hint: "Гиперболический синус числа" },
        { lowerTypeKey: "sqrt", typeKey: "sqrt", fullKey: "sqrt(x)", hint: "Положительный квадратный корень числа" },
        { lowerTypeKey: "tan", typeKey: "tan", fullKey: "tan(x)", hint: "Тангенс числа" },
        { lowerTypeKey: "tanh", typeKey: "tanh", fullKey: "tanh(x)", hint: "Гиперболический тангенс числа" },
        { lowerTypeKey: "trunc", typeKey: "trunc", fullKey: "trunc(x)", hint: "Целая часть числа, убирая дробные цифры" },
    ]

    clearInput(input) {
        let modInput = "!" + input.toLowerCase();
        let index = modInput.search(/[^a-z0-9_][a-z][a-z0-9_]*$/);
        if (index === -1) return null;
        return modInput.slice(index + 1, input.length + 1);
    }

    generate(input) {
        let linesText = [];
        if (input === null) {
            this.suggestions.forEach((s) => {
                linesText.push({ key: s.fullKey, hint: s.hint });
            });
        } else {
            this.suggestions.forEach((s) => {
                let index = s.lowerTypeKey.indexOf(input)
                if (index !== 0) return;
                let modKey = "<b>" + s.fullKey.slice(0, input.length) + "</b>" + s.fullKey.slice(input.length, s.fullKey.length);
                linesText.push({ key: modKey, hint: s.hint });
            });
            this.suggestions.forEach((s) => {
                let index = s.lowerTypeKey.indexOf(input)
                if (index <= 0) return;
                let modKey = s.fullKey.slice(0, index) + "<b>" + s.fullKey.slice(index, index + input.length) + "</b>" + s.fullKey.slice(index + input.length, s.fullKey.length);
                linesText.push({ key: modKey, hint: s.hint });
            });
            if (linesText.length === 0) return this.generate(null);
        }
        let container = document.createElement("div");
        container.className = "intellisense-container";
        linesText.forEach((l) => {
            let line = document.createElement("div");
            line.className = "intellisense-suggestion";
            line.innerHTML = l.key + " <span class=\"hint\"> (" + l.hint + ")</span>";
            container.appendChild(line);
        })
        return container;
    }
}

class Grid {
    source = document.getElementById("grid");
    context = this.source.getContext("2d");
    center = { x: 0, y: 0 };
    scale = 50;
    scaleLimits = { min: 0, max: 0 }
    mouseTracker = {
        pressed: false,
        mousePrevX: 0,
        mousePrevY: 0
    };
    gridChecks = [1];

    constructor() {
        this.source.width = window.innerWidth;
        this.source.height = window.innerHeight;
        this.center.x = this.source.width / 2;
        this.center.y = this.source.height / 2;
        this.context.font = "10px";
        this.context.textAlign = "end";
        this.context.textBaseline = "top";
        for (let i = 0; i < 20; i++) this.gridChecks.push(this.gridChecks[this.gridChecks.length - 1] / 2);
        this.gridChecks.reverse();
        for (let i = 0; i < 20; i++) this.gridChecks.push(this.gridChecks[this.gridChecks.length - 1] * 2);
        this.scaleLimits.max = this.gridChecks[this.gridChecks.length - 1];
        this.scaleLimits.min = 1e-6;
    }

    r2v(point) {
        if (typeof point === "object") return {
            x: isNaN(point.x) ? null : (point.x - this.center.x) / this.scale,
            y: isNaN(point.y) ? null : (this.center.y - point.y) / this.scale
        };
        if (typeof point == "number") return point / this.scale;
    }

    v2r(point) {
        if (typeof point === "object") return {
            x: isNaN(point.x) ? null : this.center.x + point.x * this.scale,
            y: isNaN(point.y) ? null : this.center.y - point.y * this.scale
        };
        if (typeof point === "number") return point * this.scale;
    }

    getVWidth() {
        return this.source.width / this.scale;
    }

    getVHeight() {
        return this.source.height / this.scale;
    }

    getVLeftEdge() {
        return -this.center.x / this.scale;
    }

    getVRightEdge() {
        return this.getVLeftEdge() + this.getVWidth();
    }

    getVTopEdge() {
        return this.center.y / this.scale;
    }

    getVBottomEdge() {
        return this.getVTopEdge() - this.getVHeight();
    }

    virtualMoveTo(context, x, y) {
        let pointR = this.v2r({ x: x, y: y });
        context.moveTo(pointR.x, pointR.y);
    }

    virtualLineTo(context, x, y) {
        let pointR = this.v2r({ x: x, y: y });
        context.lineTo(pointR.x, pointR.y);
    }

    virtualArc(context, x, y, radius, startAngle = 0, endAngle = 2 * Math.PI, anticlockwise = false) {
        let centerR = this.v2r({ x: x, y: y });
        context.arc(centerR.x, centerR.y, this.v2r(radius), startAngle, endAngle, anticlockwise);
    }

    virtualFillText(context, text, x, y) {
        let anchor = this.v2r({ x: x, y: y });
        context.fillText(text, anchor.x, anchor.y);
    }

    virtualClear(context) {
        context.clearRect(0, 0, this.source.width, this.source.height);
    }

    print() {
        let leftEdge = this.getVLeftEdge();
        let rightEdge = this.getVRightEdge();
        let topEdge = this.getVTopEdge();
        let bottomEdge = this.getVBottomEdge();
        let stepClear = 50 / this.scale;
        let step = findClosest(stepClear, this.gridChecks);
        let xMin = Math.trunc(this.getVLeftEdge() / step) * step - step;
        let xMax = Math.trunc(this.getVRightEdge() / step) * step + step;
        let yMin = Math.trunc(this.getVBottomEdge() / step) * step - step;
        let yMax = Math.trunc(this.getVTopEdge() / step) * step + step;
        this.context.clearRect(0, 0, this.source.width, this.source.height);

        // Grid
        this.context.save();
        this.context.strokeStyle = "rgba(0, 0, 255, 0.8)";
        this.context.lineWidth = 0.5;
        this.context.beginPath();
        for (let x = xMin; x < xMax; x += step) {
            this.virtualMoveTo(this.context, x, this.getVTopEdge());
            this.virtualLineTo(this.context, x, this.getVBottomEdge());
            let numberCoords = this.v2r({ x: x, y: 0 });
            this.context.fillText(x, numberCoords.x - 5, numberCoords.y + 5);
        }
        for (let y = yMin; y < yMax; y += step) {
            this.virtualMoveTo(this.context, this.getVLeftEdge(), y);
            this.virtualLineTo(this.context, this.getVRightEdge(), y);
            let numberCoords = this.v2r({ x: 0, y: y });
            this.context.fillText(y, numberCoords.x - 5, numberCoords.y + 5);
        }
        this.context.stroke();

        let smoothValue = (this.gridChecks[this.gridChecks.indexOf(step) + 1] / stepClear - 1.33) / 1.33;
        this.context.strokeStyle = "rgba(0, 0, 255, " + smoothValue * 0.8 + ")";
        this.context.fillStyle = "rgba(0, 0, 0, " + (smoothValue < 0.5 ? 0 : (smoothValue - 0.5) * 2) + ")";
        this.context.beginPath();
        for (let x = xMin + step / 2; x < xMax; x += step) {
            this.virtualMoveTo(this.context, x, this.getVTopEdge());
            this.virtualLineTo(this.context, x, this.getVBottomEdge());
            let numberCoords = this.v2r({ x: x, y: 0 });
            this.context.fillText(x, numberCoords.x - 5, numberCoords.y + 5);
        }
        for (let y = yMin + step / 2; y < yMax; y += step) {
            this.virtualMoveTo(this.context, this.getVLeftEdge(), y);
            this.virtualLineTo(this.context, this.getVRightEdge(), y);
            let numberCoords = this.v2r({ x: 0, y: y });
            this.context.fillText(y, numberCoords.x - 5, numberCoords.y + 5);
        }
        this.context.stroke();
        this.context.restore();

        // Axes
        this.context.save();
        this.context.strokeStyle = "rgba(0, 0, 0, 1)";
        this.context.lineWidth = 1.5;
        this.context.beginPath();
        this.virtualMoveTo(this.context, leftEdge, 0);
        this.virtualLineTo(this.context, rightEdge, 0);
        this.virtualMoveTo(this.context, 0, bottomEdge);
        this.virtualLineTo(this.context, 0, topEdge);
        this.context.stroke();
        this.context.restore();

        // Axes arrows
        this.context.save();
        let rightArrowCoreR = this.v2r({ x: rightEdge, y: 0 });
        let topArrowCoreR = this.v2r({ x: 0, y: topEdge });
        this.context.beginPath();
        this.context.moveTo(rightArrowCoreR.x - 10, rightArrowCoreR.y - 4);
        this.context.lineTo(rightArrowCoreR.x, rightArrowCoreR.y);
        this.context.lineTo(rightArrowCoreR.x - 10, rightArrowCoreR.y + 4);
        this.context.closePath();
        this.context.fill();
        this.context.beginPath();
        this.context.moveTo(topArrowCoreR.x - 4, topArrowCoreR.y + 10);
        this.context.lineTo(topArrowCoreR.x, topArrowCoreR.y);
        this.context.lineTo(topArrowCoreR.x + 4, topArrowCoreR.y + 10);
        this.context.closePath();
        this.context.fill();
        this.context.restore();
    }

    printBackgroundFunction() {
        this.context.save();
        this.context.lineWidth = 5;
        this.context.beginPath();
        BACKGROUNDFUNCTION.forEach(point => {
            this.virtualLineTo(this.context, point.x, point.y);
        });
        this.context.stroke();
        this.context.restore();
    }
}
