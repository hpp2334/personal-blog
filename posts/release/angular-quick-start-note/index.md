---
date: "2020-11-20"
title: "Angular 入门笔记"
tags: ['fe', 'ng']
abstract: 'Angular 入门笔记。'
requirements: ['请先阅读 Angular 官方文档', '请先阅读 RxJS 文档']
---

## 版本

Angular: 11.2.7  

## 参考

[Angular - NgModule 简介](https://angular.cn/guide/architecture-modules)  
[Angular - 术语表](https://angular.cn/guide/glossary)  
[Angular - 响应式表单](https://angular.cn/guide/reactive-forms#displaying-a-form-control-value)  

## 基础概念

## 模块（Module）

模块顾名思义，承担容器的作用，通过 `@NgModule` 装饰。一个模块的基本组成如下。

```js
@NgModule({
  imports:      [ BrowserModule ],  // imports: 导入其他所需模块
  providers:    [ Logger ],         // providers: 导入服务（Service）
  declarations: [ AppComponent ],   // declarations：声明组件（Component）、指令（Directive）、管道（Pipe）
  exports:      [ AppComponent ],   // exports：导出能在其他模块的组件模板中使用的可声明对象
  bootstrap:    [ AppComponent ]    // bootstrap：主视图（只有根模块可以设置）
})
export class AppModule { }
```

一个 Angular 应用一定会有 **根模块**（通常命名为 `AppModule`），除此之外还可以引入其他模块，如常用模块 `BrowserModule`（使应用可在浏览器中运行）,`CommonModule`（使 `ngFor`, `ngIf` 可被识别）等。 

## 指令（Directive）

可以修改 DOM、组件数据模型中某些属性的类，由 `@Directive` 装饰。指令可分为三类：

- 组件（由 `@Component()` 装饰）  
- 属性型指令（如 `[...]`, `(...)`）  
- 结构型指令（如 `*ngIf`, `*ngFor`）  

通过指令，可以控制 DOM，扩展模板语法等。

### 属性型指令

属性型指令看起来像是 HTML 属性，会监听与修改其他 HTML 元素和组件的行为，常见的内置属性型指令有 `ngClass`, `ngStyle`, `ngModel` 等。  

#### 创建新的属性型指令

通过 `@Directive({ selector: [...] })` 修饰类，其中方括号 `[]` 是必须的，表示这是一个属性型指令选择器。在类中：  

- 引用 DOM 元素：通过 `constructor(el: ElementRef)`；  
- 增加模板数据绑定项：使用 `@Input()`；  
- 使自己可被数据绑定：使用 `@Input(alias)`，alias 与 selector 方括号中的内容相同；  
- 处理事件：使用 `@HostListener(eventName)`；  

最后，该类需要在 module 的 `declarations` 中被声明。  

官方给出了一个 [hover 高亮](https://stackblitz.com/angular/qydgjxoplqv?file=src%2Fapp%2Fhighlight.directive.ts) 的例子。

### 结构型指令

结构型指令负责 HTML 布局，维护 DOM 结构，常用的结构型指令有 `ngIf`, `ngFor`, `ngSwitch` 等。

#### 星号（\*）前缀

星号前缀用于简化结构型指令中绑定的 **微语法**，是语法糖，如

```html
<div *ngIf="hero" class="name">{{hero.name}}</div>
```

被简化为

```html
<ng-template [ngIf]="hero">
  <div class="name">{{hero.name}}</div>
</ng-template>
```

#### 微语法

Angular 微语法形式如：

```
*<prefix>="(<let> | <expression>) (';' | ',')? (<let> | <as> | <keyExp>)*"
```

其中，

```
<keyExp> => <key> ":"? <expression> ("as" <local>)? ";"?
<let> => "let" <local> "=" <export> ";"?
<as> = <export> "as" <local> ";"?
```

- `<prefix>`, `<key>`：HTML 属性键  
- `<local>`：模板中使用的局部变量名  
- `<export>`：指令使用该名称作为导出名称  
- `<expression>`：Angular 标准表达式  

#### 创建新的结构型指令

通过 `@Directive({ selector: [...] })` 修饰类，其中方括号 `[]` 是必须的，表示这是一个属性型指令选择器（上述与“创建新的属性型指令”相同）。在类中：  

- 构造函数：`constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef) {}`（`TemplateRef` 可以访问 `<ng-template>` 中的内容，`ViewContainerRef` 是当前节点视图容器的引用）；  
- 监听：使用 `@Input()` 装饰 setter
- 显示子组件：使用 `this.viewContainer.createEmbeddedView(this.templateRef)`  
- 销毁子组件：使用 `this.viewContainer.clear()`  

## 模板（Template）

- 插值：`{{ ... }}`；  
- 绑定：
  - 数据源到视图（属性）：`[...]="..."`, `bind-...="..."`  
  - 视图到数据源（事件）：`(...)="..."`, `on-...="..."`  
  - 双向：`[(...)]="..."`, `bindon-...="..."`  

### 模板引用变量

模板引用变量形如 `#...`，可以引用模板中的 DOM 元素、指令、元素、TemplateRef、Web 组件，作用域被 `<ng-template>` 分隔。  

### 管道

管道为 pipe，在模板中使用，形式如 `<exp> '|' 'pipe' (:<exp-as-arg>)*`，模板中的值会经过管道转换后再输出。常用管道有 `AsyncPipe`, `DatePipe`, `SlicePipe` 等。  

管道分为 纯的（pure） 与 非纯：

- 纯管道：当值发生变化时（浅比较）才会重新执行  
- 非纯管道：当按键或鼠标移动时会重新执行  

#### 创建一个管道

以 `@Pipe({ name: ..., pure: ... })` 修饰类，并实现 `PipeTransform` 接口，其中：

- `name`：模板中管道的名称；  
- `pure`：指示管道是否是纯的，默认为 `true`；  

类中需要实现 `transform` 方法，参数即为管道的传参，返回运算结果。  

## 组件（Component）

组件负责 暴露数据 与 处理交互逻辑，由 `@Component`（其继承 `@Directive`）装饰。组件与模板（Template）共同组成视图（View）。

### 数据传输

#### `@Input()`：父组件传给子组件数据

- 子组件类：通过 `@Input()` 修饰成员，成员可以是变量、getter/setter（此方法可通过 `ngOnChanges` 生命周期检测值变动）；  
- 父组件模板：使用 数据绑定 传输数据；  

#### `@Output()`：父组件绑定子组件事件

- 子组件类：通过 `@Output()` 修饰 `EventEmitter` 类示例，需要时通过该实例上的 `emit` 方法发出事件；  
- 父组件模板：使用 事件绑定 绑定事件（如 `(childCompEvEmitterInstanceName)=handleEvent($event)`，其中 `$event` 是固定的）；  

#### `#localVar`：父组件模板访问子组件数据与方法

- 父组件模板：在子组件标签上使用 `#xxx` 新建一个本地变量代表子组件，在模板中便使用形如 `xxx.f1()`, `xxx.x1` 访问子组件的数据与方法；  

#### `@ViewChild()`：父组件访问子组件数据

- 父组件类：通过 `@ViewChild(ChildComponentClass)` 修饰子组件类，便可在类中访问子组件的数据（被注入的子组件只有在父组件视图显示后才能被访问，对应生命周期函数为 `ngAfterViewInit`）；  

#### 服务：双向数据流

可通过父子组件共享一个服务来做到双向数据。

### 样式

Angular 会自动做 CSS 模块化，不需要担心类名污染的问题，同时支持 `.scss`, `.less` 等。  

#### 特殊的选择器

- `:host`：用于选择宿主元素；  
- `:host-context(className)`：用于选择视图外的条件，会沿根查找 `className` 直到根；  

#### 配置

- `@Component({ styleUrls })`：配置 CSS 文件；  
- `@Component({ style })`：配置 CSS，只支持纯 CSS；  
- `@Component({ template: '<style>...</style>' })`：内联 CSS；  
- `@Component({ template: '<link href="...">' })`：配置 CSS 文件，只支持相对路径；  
- CSS `@imports`  

### 动态组件

以动态广告为例：

- 指令：新建指令 `@Directive({ selector: '[adHost]' }) class AdHostDirective { constructor(public viewContainerRef: ViewContainerRef) {} }`；  
- 模板：插入 `<ng-template adHost>`；
- 类成员：`@ViewChild(AdHostDirective, { static: true }) adHost: BannerDirective;`，这使得类可以控制 template 的内容显示；
- 构造函数：`constructor(private componentFactoryResolver: ComponentFactoryResolver) { }`，其中 `ComponentFactoryResolver` 用于将组件类转为解析为工厂方法；  
- 动态组件实例化：导入目标组件类，通过 `componentFactoryResolver.resolveComponentFactory(component)` 解析为工厂方法 `componentFactory`，`adHost.viewContainerRef.clear()` 清空视图内容，`adHost.viewContainerRef.createComponent<...>(componentFactory)` 实例化组件并插入到视图中；  



## 服务（Service）

封装了非 UI 逻辑的类，由 `@Injectable` 装饰，用于加强逻辑复用性。

## 其他

- 伪指令 `ngNonBindable` 可以禁止子元素的插值与任何类型的绑定；  


## 常用特性

### 表单

#### 响应式表单与校验

`ReactiveFormsModule`, `FormsModule` 需要导入用于处理响应式表单逻辑。编写表单通常使用以下类：

- `FormControl` 类用于创建表单控件，绑定在表单控件上（如 `input`）；  
- `FormGroup` 类用于创建表单控件分组，通常绑定在 `form` 上；（如果使用 `FormGroup`，则其包含的表单控件不需要在模板上绑定）；  
- `FormBuilder` 服务是 util 类，用于快速生成 `FormGroup`, `FormControl`, `FormArray`；  

对于表单校验，有如下选择：  
- 内置校验：通过 `Validators` 对象，如 `Validators.require`, `Validators.maxlength(...)` 等；  
- 自定义同步校验：通过实现 `ValidatorFn` 工厂（见 Demo 中 `fbcv.component.ts` 及对应的模板）  
- 自定义异步校验：通过实现 `AsyncValidator`，然后将 `validate` 成员函数设置在表单控件初始化处  

另外，`FormGroup` 的 options 中可设置校验器以实现 **交叉校验**。

<Collapse title="Demo" maxHeight="500">
<iframe src="https://codesandbox.io/embed/reactive-form-simple-demo-x1htf?fontsize=14&hidenavigation=1&theme=dark"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="reactive-form-simple-demo"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
</Collapse>

#### 动态响应式表单

动态表单实际上是由响应式表单灵活实现。

<Collapse title="Demo" maxHeight="500">
<iframe src="https://codesandbox.io/embed/reactive-dynamic-form-simple-demo-rr778?fontsize=14&hidenavigation=1&theme=dark"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="reactive-dynamic-form-simple-demo"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
</Collapse>

### 路由

一般情况下，路由机制需要考虑的问题及 Angular 的支持如下

- **路由注册**：通过 `@angular/router` 中的 `RouterModule`，编写路由列表时通过属性 `component` 指定组件（见 Demo 中的 app-routing\.module\.ts）；  
- **路由路径**：一般路径如 `path/to`；带参数路径如 `path/:param`；通配符 `**`，一般用于 404 页面（见 xxx-routing\.module\.ts）；  
- **获取路由信息与更改路由**：通过 `@angular/router` 中的 `ActivatedRoute`, `Router` 服务 DashBoard/Datalist）；   
- **懒加载**（Lazy Loading，文档中表述为 “惰性加载”）：将原先的 component 封装为 module，原属性 `component` 换为 `loadChildren` 并改为 `import()` 动态导入模块（见 DashBoard）；  
- **路由模式**（History API 或 Hash）：通过在 `RouterModule.forRoot` 的 `LocationStrategy` 指定为 `PathLocationStrategy`（History API）或 `HashLocationStrategy`；  
- **路由守卫**：通过实现 `CanActivate`, `CanActivateChild` 等接口的服务后，在路由列表的 `canLoad`, `canActivate` 等属性上注册；
- **重定向**：通过配置路由列表中的 `redirectTo` 属性（见 app-routing\.module\.ts）；  
- **嵌套路由**：通过配置 `children` 属性（见 DashBoard）  

<Collapse title="Demo" maxHeight="500">
<iframe src="https://codesandbox.io/embed/quirky-snowflake-9zhut?fontsize=14&hidenavigation=1&theme=dark"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="router-simple-demo"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
</Collapse>


### 网络请求

一般情况下，网络请求需要考虑的问题及 Angular 的支持如下  

- **基础 AJAX 请求与内容解析**：使用 `HttpClientModule` 模块，通过 `http[method](url, options)` 实现（其中 `http` 为 `HttpClient` 服务），其中 options 为如下  

  ```js
  interface Options {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    observe?: 'body' | 'events' | 'response',
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    responseType?: 'arraybuffer'|'blob'|'json'|'text',
    withCredentials?: boolean,
  }
  ```

  因此可以设置请求头，相应数据类型等。另外，这种方式返回 observable 对象，后续可做错误处理等。

- **JSONP 请求**：使用 `HttpClientJsonpModule` 模块，通过 `http.jsonp(...)` 实现；  
- **错误处理**：使用 `rxjs/operators` 中的 `catchError`；  
- **请求重试**：使用 `rxjs/operators` 中的 `retry`；  
- **拦截器**：使用实现 `HttpInterceptor` 接口的服务类实现；  
- **安全**：使用 `HttpClientXsrfModule` 模块，配合后端完成 CSRF 攻击防护；  

<Collapse title="Demo" maxHeight="500">
<iframe src="https://codesandbox.io/embed/ng-demo-http-6wcp2?fontsize=14&hidenavigation=1&theme=dark"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="ng-demo-http"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
</Collapse>