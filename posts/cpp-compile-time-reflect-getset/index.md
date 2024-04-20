## 前言

最近发现 refl-cpp 库可以实现编译期计算反射读写的结果，比较好奇内部的实现。因此在浅略地学习内部实现后，笔者实现了一个简单反射库，主要目的是学习 C++ 模板编程。

这个库支持以下功能：

- `Reflect::get(...)` 反射读结构体成员属性
- `Reflect::set(...)` 反射写结构体成员属性
- `forEach<T>(...)` 遍历结构体成员

完整的代码放在了 [这里](<https://cpp.sh/?source=%23include+%3Cchrono%3E%0A%23include+%3Ccstdio%3E%0A%23include+%3Cfstream%3E%0A%23include+%3Ciostream%3E%0A%23include+%3Crandom%3E%0A%23include+%3Cstdexcept%3E%0A%23include+%3Cstring%3E%0A%23include+%3Ctuple%3E%0A%23include+%3Ctype_traits%3E%0A%23include+%3Cutility%3E%0A%23include+%3Cvector%3E%0Ausing+namespace+std%3A%3Achrono%3B%0A%0A%2F%2F+%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D+CORE+START+%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%0A%0Atemplate+%3Ctypename+T%3E+struct+TypeInfo%3B%0A%0Atemplate+%3Ctypename...+T%3E+struct+TypeList+%7B%7D%3B%0A%0Atemplate+%3Cint+SIZE%3E+struct+ConstStr+%7B%0A++static+constexpr+int+LEN+%3D+SIZE+-+1%3B%0A++constexpr+explicit+ConstStr()+%3A+_s%7B%7D+%7B%7D%0A++constexpr+explicit+ConstStr(const+char+(%26s)%5BSIZE%5D)%0A++++++%3A+ConstStr(s%2C+std%3A%3Amake_index_sequence%3CSIZE%3E())+%7B%7D%0A%0A++constexpr+size_t+size()+const+%7B+return+LEN%3B+%7D%0A++constexpr+inline+auto+data()+const+%7B+return+_s%3B+%7D%0A++constexpr+inline+auto+data()+%7B+return+_s%3B+%7D%0A%0Aprivate%3A%0A++template+%3Csize_t...+Idx%3E%0A++constexpr+explicit+ConstStr(const+char+(%26s)%5BSIZE%5D%2C%0A++++++++++++++++++++++++++++++std%3A%3Aindex_sequence%3CIdx...%3E)%0A++++++%3A+_s%7Bs%5BIdx%5D...%7D+%7B%7D%0A%0A++char+_s%5BSIZE%5D%3B%0A%7D%3B%0A%0Atemplate+%3Cint+N%2C+int+M%3E%0Aconstexpr+bool+operator%3D%3D(const+ConstStr%3CN%3E+%26a%2C+const+ConstStr%3CM%3E+%26b)+noexcept+%7B%0A++if+constexpr+(N+!%3D+M)+%7B%0A++++return+false%3B%0A++%7D+else+%7B%0A++++%2F%2F+the+last+is+%5C0%2C+can+skip+compare%0A++++for+(size_t+i+%3D+0%3B+i+%3C+M+-+1%3B+i%2B%2B)+%7B%0A++++++if+(a.data()%5Bi%5D+!%3D+b.data()%5Bi%5D)+%7B%0A++++++++return+false%3B%0A++++++%7D%0A++++%7D%0A++++return+true%3B%0A++%7D%0A%7D%0A%0Atemplate+%3Cint+N%2C+int+M%3E%0Aconstexpr+ConstStr%3CN+%2B+M%3E+operator%2B(const+ConstStr%3CN%3E+%26a%2C%0A++++++++++++++++++++++++++++++++++++const+ConstStr%3CM%3E+%26b)+noexcept+%7B%0A++auto+s+%3D+ConstStr%3CN+%2B+M%3E()%3B%0A++for+(auto+i+%3D+0%3B+i+%3C+N%3B+i%2B%2B)+%7B%0A++++s.data()%5Bi%5D+%3D+a.data()%5Bi%5D%3B%0A++%7D%0A++for+(auto+j+%3D+0%3B+j+%3C+M%3B+j%2B%2B)+%7B%0A++++s.data()%5BN+%2B+j%5D+%3D+b.data()%5Bj%5D%3B%0A++%7D%0A++return+s%3B%0A%7D%0A%0A%23define+REFLECT_BEGIN(Type)++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++template+%3C%3E+struct+TypeInfo%3CType%3E+%7B++++++++++++++++++++++++++++++++++++++++++%5C%0A++++typedef+Type+ClassType%3B++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++++template+%3Csize_t+Idx%3E+struct+Member+%7B%7D%3B++++++++++++++++++++++++++++++++++++%5C%0A++++static+constexpr+size_t+fieldOffset+%3D+__COUNTER__%3B%0A%0A%23define+REFLECT_FIELD(Field)+++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++static+constexpr+size_t+MEMBER_%23%23Field%23%23_OFFSET+%3D+__COUNTER__%3B+++++++++++++++%5C%0A++template+%3C%3E+struct+Member%3CMEMBER_%23%23Field%23%23_OFFSET+-+fieldOffset+-+1%3E+%7B+++++++%5C%0A++public%3A++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++++typedef+decltype(ClassType%3A%3AField)+MemberType%3B+++++++++++++++++++++++++++++%5C%0A++++static+constexpr+auto+name+%3D+ConstStr(%23Field)%3B+++++++++++++++++++++++++++++%5C%0A++++static+constexpr+auto+pointer+%3D+%26ClassType%3A%3AField%3B+++++++++++++++++++++++++%5C%0A++%7D%3B+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++static+constexpr+Member%3CMEMBER_%23%23Field%23%23_OFFSET+-+fieldOffset+-+1%3E+Field()+%7B+%5C%0A++++return+%7B%7D%3B+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++%7D%0A%0A%23define+REFLECT_END++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++static+constexpr+size_t+memberCount+%3D+__COUNTER__+-+fieldOffset+-+1%3B+++++++++%5C%0A++%7D++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++%5C%0A++%3B%0A%0Astruct+Reflect+%7B%0A++template+%3Ctypename+C%2C+size_t+Idx%3E%0A++using+Member+%3D+typename+TypeInfo%3CC%3E%3A%3Atemplate+Member%3CIdx%3E%3B%0A%0A++template+%3Ctypename+C%2C+typename+M%3E+constexpr+static+auto+get(const+C+%26pt%2C+M)+%7B%0A++++constexpr+auto+pointer+%3D+M%3A%3Apointer%3B%0A++++return+pt.*pointer%3B%0A++%7D%0A++template+%3Ctypename+C%2C+typename+M%3E%0A++constexpr+static+void+set(C+%26pt%2C+M%2C+const+typename+M%3A%3AMemberType+%26val)+%7B%0A++++constexpr+auto+pointer+%3D+M%3A%3Apointer%3B%0A++++pt.*pointer+%3D+val%3B%0A++%7D%0A%0A++template+%3Ctypename+C%3E+constexpr+static+auto+getMembers()+%7B%0A++++constexpr+auto+seq+%3D+std%3A%3Amake_index_sequence%3CTypeInfo%3CC%3E%3A%3AmemberCount%3E()%3B%0A++++return+getMembers%3CC%3E(seq)%3B%0A++%7D%0A++template+%3Ctypename+C%2C+typename+F%3E+constexpr+static+void+forEach(F+%26%26f)+%7B%0A++++forEach(getMembers%3CC%3E()%2C+std%3A%3Aforward%3CF%3E(f))%3B%0A++%7D%0A++%2F%2F+forEach%0A++template+%3Ctypename+F%2C+typename...+Ts%3E%0A++constexpr+static+void+forEach(TypeList%3CTs...%3E%2C+F+%26%26f)+%7B%0A++++forEach(TypeList%3CTs...%3E%7B%7D%2C+std%3A%3Amake_index_sequence%3Csizeof...(Ts)%3E()%2C%0A++++++++++++std%3A%3Aforward%3CF%3E(f))%3B%0A++%7D%0A%0Aprivate%3A%0A++%2F%2F+getMembers%0A++template+%3Ctypename+C%2C+size_t...+Idx%3E%0A++constexpr+static+TypeList%3CMember%3CC%2C+Idx%3E...%3E%0A++getMembers(std%3A%3Aindex_sequence%3CIdx...%3E)+%7B%0A++++return+%7B%7D%3B%0A++%7D%0A%0A++template+%3Ctypename+F%3E%0A++constexpr+static+void+forEach(TypeList%3C%3E%2C+std%3A%3Aindex_sequence%3C%3E%2C+F+%26%26)+%7B%7D%0A%0A++template+%3Ctypename+F%2C+typename...+Ts%2C+typename+T%2C+size_t...+Idx%2C+size_t+I%3E%0A++constexpr+static+void+forEach(TypeList%3CT%2C+Ts...%3E%2C%0A++++++++++++++++++++++++++++++++std%3A%3Aindex_sequence%3CI%2C+Idx...%3E%2C+F+%26%26f)+%7B%0A++++f(T%7B%7D)%3B%0A++++forEach(TypeList%3CTs...%3E%7B%7D%2C+std%3A%3Aindex_sequence%3CIdx...%3E%7B%7D%2C%0A++++++++++++std%3A%3Aforward%3CF%3E(f))%3B%0A++%7D%0A%7D%3B%0A%0A%2F%2F+%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D+CORE+END+%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%0A%0Astruct+Point+%7B%0A++float+x%3B%0A++float+y%3B%0A++float+z%3B%0A%7D%3B%0A%0AREFLECT_BEGIN(Point)%0AREFLECT_FIELD(x)%0AREFLECT_FIELD(y)%0AREFLECT_FIELD(z)%0AREFLECT_END%0A%0Atemplate+%3Ctypename+T%3E+std%3A%3Astring+serialize(const+T+%26pt)+%7B%0A++std%3A%3Astring+s+%3D+%22%7B%22%3B%0A++bool+isFirst+%3D+true%3B%0A++Reflect%3A%3AforEach%3CPoint%3E(%5B%26%5D(auto+member)+%7B%0A++++static+constexpr+auto+a+%3D+ConstStr(%22%2C%5C%22%22)+%2B+member.name+%2B+ConstStr(%22%5C%22%3A%22)%3B%0A++++static+constexpr+auto+b+%3D+member.name+%2B+ConstStr(%22%5C%22%3A%22)%3B%0A++++s+%2B%3D+(isFirst+%3F+b.data()+%3A+a.data())%3B%0A++++isFirst+%3D+false%3B%0A++++auto+v+%3D+Reflect%3A%3Aget(pt%2C+member)%3B%0A++++s+%2B%3D+std%3A%3Ato_string(v)%3B%0A++%7D)%3B%0A++s+%2B%3D+%22%7D%22%3B%0A++return+s%3B%0A%7D%0A%0Astd%3A%3Astring+manualSerialize(const+Point+%26pt)+%7B%0A++std%3A%3Astring+s+%3D+%22%7B%5C%22x%5C%22%3A%22%3B%0A++s+%2B%3D+std%3A%3Ato_string(pt.x)%3B%0A++s+%2B%3D+%22%2C%5C%22y%5C%22%3A%22%3B%0A++s+%2B%3D+std%3A%3Ato_string(pt.y)%3B%0A++s+%2B%3D+%22%2C%5C%22z%5C%22%3A%22%3B%0A++s+%2B%3D+std%3A%3Ato_string(pt.z)%3B%0A++s+%2B%3D+%22%7D%22%3B%0A++return+s%3B%0A%7D%0A%0Atemplate+%3Ctypename+F%3E+void+profile(const+F+%26fn)+%7B%0A++auto+start+%3D+high_resolution_clock%3A%3Anow()%3B%0A++fn()%3B%0A++auto+end+%3D+high_resolution_clock%3A%3Anow()%3B%0A++auto+duration+%3D+duration_cast%3Cmilliseconds%3E(end+-+start)%3B%0A++std%3A%3Acout+%3C%3C+duration.count()+%3C%3C+std%3A%3Aendl%3B%0A%7D%0A%0Ainline+void+example_perf_serialize()+%7B%0A++std%3A%3Amt19937+rng(std%3A%3Arandom_device%7B%7D())%3B%0A++std%3A%3Avector%3CPoint%3E+pts%3B%0A++constexpr+int+N+%3D+static_cast%3Cint%3E(1e7)%3B%0A%0A++Reflect%3A%3Aget(pts%5B0%5D%2C+TypeInfo%3CPoint%3E%3A%3Ax())%3B%0A%0A++for+(int+i+%3D+0%3B+i+%3C+N%3B+i%2B%2B)+%7B%0A++++pts.emplace_back(Point%7B%0A++++++++.x+%3D+rng()+%2F+1000.f%2C%0A++++++++.y+%3D+rng()+%2F+1000.f%2C%0A++++++++.z+%3D+rng()+%2F+1000.f%2C%0A++++%7D)%3B%0A++%7D%0A%0A++profile(%5B%26%5D+%7B%0A++++for+(const+auto+%26pt+%3A+pts)+%7B%0A++++++manualSerialize(pt)%3B%0A++++%7D%0A++%7D)%3B%0A%0A++profile(%5B%26%5D()+%7B%0A++++for+(const+auto+%26pt+%3A+pts)+%7B%0A++++++serialize(pt)%3B%0A++++%7D%0A++%7D)%3B%0A%7D%0A%0Avoid+example_iterateAllProps()+%7B%0A++Point+pt%7B.x+%3D+1%2C+.y+%3D+2%2C+.z+%3D+3%7D%3B%0A++Reflect%3A%3AforEach%3CPoint%3E(%5B%26%5D(auto+member)+%7B%0A++++std%3A%3Acout+%3C%3C+member.name.data()+%3C%3C+%22%3A%22+%3C%3C+Reflect%3A%3Aget(pt%2C+member)%0A++++++++++++++%3C%3C+std%3A%3Aendl%3B%0A++%7D)%3B%0A%0A++%2F%2F+Output%3A%0A++%2F%2F+x%3A1%0A++%2F%2F+y%3A2%0A++%2F%2F+z%3A3%0A%7D%0A%0Avoid+example_iterateSomeProps()+%7B%0A++typedef+TypeInfo%3CPoint%3E+T%3B%0A++constexpr+TypeList%3Cdecltype(T%3A%3Ax())%2C+decltype(T%3A%3Az())%3E+props%3B%0A++Point+pt%7B.x+%3D+1%2C+.y+%3D+2%2C+.z+%3D+3%7D%3B%0A++Reflect%3A%3AforEach(props%2C+%5B%26%5D(auto+member)+%7B%0A++++std%3A%3Acout+%3C%3C+member.name.data()+%3C%3C+%22%3A%22+%3C%3C+Reflect%3A%3Aget(pt%2C+member)%0A++++++++++++++%3C%3C+std%3A%3Aendl%3B%0A++%7D)%3B%0A%0A++%2F%2F+Output%3A%0A++%2F%2F+x%3A1%0A++%2F%2F+z%3A3%0A%7D%0A%0Avoid+example()+%7B%0A++Point+pt%7B.x+%3D+1%2C+.y+%3D+2%2C+.z+%3D+3%7D%3B%0A++std%3A%3Acout+%3C%3C+%22get(x)%3A%22+%3C%3C+Reflect%3A%3Aget(pt%2C+TypeInfo%3CPoint%3E%3A%3Ax())+%3C%3C+std%3A%3Aendl%3B%0A%0A++Reflect%3A%3Aset(pt%2C+TypeInfo%3CPoint%3E%3A%3Ay()%2C+4)%3B%0A++std%3A%3Acout+%3C%3C+%22after+set+y%3D4%3A%22+%3C%3C+pt.y+%3C%3C+std%3A%3Aendl%3B%0A%0A++std%3A%3Acout+%3C%3C+%22foreach%3A%22+%3C%3C+std%3A%3Aendl%3B%0A++Reflect%3A%3AforEach%3CPoint%3E(%5B%26%5D(auto+%26%26member)+%7B%0A++++std%3A%3Acout+%3C%3C+member.name.data()+%3C%3C+%22%3A%22+%3C%3C+Reflect%3A%3Aget(pt%2C+member)%0A++++++++++++++%3C%3C+std%3A%3Aendl%3B%0A++%7D)%3B%0A%0A++%2F%2F+get(x)%3A1%0A++%2F%2F+after+set+y%3D4%3A4%0A++%2F%2F+foreach%3A%0A++%2F%2F+x%3A1%0A++%2F%2F+y%3A4%0A++%2F%2F+z%3A3%0A%7D%0A%0Aint+main()+%7B+example()%3B+%7D>)，以下是使用的例子。

```cpp
struct Point {
  float x;
  float y;
  float z;
};

REFLECT_BEGIN(Point)
REFLECT_FIELD(x)
REFLECT_FIELD(y)
REFLECT_FIELD(z)
REFLECT_END

void example() {
  Point pt{.x = 1, .y = 2, .z = 3};
  std::cout << "get(x):" << Reflect::get(pt, TypeInfo<Point>::x()) << std::endl;

  Reflect::set(pt, TypeInfo<Point>::y(), 4);
  std::cout << "after set y=4:" << pt.y << std::endl;

  std::cout << "foreach:" << std::endl;
  Reflect::forEach<Point>([&](auto &&member) {
    std::cout << member.name.data() << ":" << Reflect::get(pt, member)
              << std::endl;
  });

  // get(x):1
  // after set y=4:4
  // foreach:
  // x:1
  // y:4
  // z:3
}

int main() { example(); }
```

## 编译期计算的字符串 `ConstStr`

在元信息中需要存储成员属性的名称，需要使用可以编译期进行表达、字符串连接、字符串判等的结构。以下定义了 `ConstStr`，其通过字符串常量初始化。

```cpp
template <int SIZE> struct ConstStr {
  static constexpr int LEN = SIZE - 1;
  constexpr explicit ConstStr() : _s{} {}
  // "const char (&s)[SIZE]" 表示 "const char s[SIZE]" 的引用
  constexpr explicit ConstStr(const char (&s)[SIZE])
      : ConstStr(s, std::make_index_sequence<SIZE>()) {}

private:
  template <size_t... Idx>
  constexpr explicit ConstStr(const char (&s)[SIZE],
                              std::index_sequence<Idx...>)
      : _s{s[Idx]...} {}

  char _s[SIZE];
};
```

以下补充一些辅助方法：

```cpp
template <int SIZE> struct ConstStr {
  constexpr size_t size() const { return LEN; }
  constexpr inline auto data() const { return _s; }
  constexpr inline auto data() { return _s; }
};
```

再实现字符串的相连与判等

```cpp
template <int N, int M>
constexpr bool operator==(const ConstStr<N> &a, const ConstStr<M> &b) noexcept {
  if constexpr (N != M) {
    return false;
  } else {
    // 最后是 \0，可以跳过对比
    for (size_t i = 0; i < M - 1; i++) {
      if (a.data()[i] != b.data()[i]) {
        return false;
      }
    }
    return true;
  }
}

template <int N, int M>
constexpr ConstStr<N + M> operator+(const ConstStr<N> &a,
                                    const ConstStr<M> &b) noexcept {
  auto s = ConstStr<N + M>();
  for (auto i = 0; i < N; i++) {
    s.data()[i] = a.data()[i];
  }
  for (auto j = 0; j < M; j++) {
    s.data()[N + j] = b.data()[j];
  }
  return s;
}
```

## 元信息存储

假定需要支持结构体 `Point { float x; float y; float z; } ` 的反射读写能力，以属性 `x` 为例，使用 traits 技巧记录以下信息：

- 成员类型
- 成员名，使用 `ConstStr` 表达
- 成员指针，当有数据时可获取成员值

对于整一个结构，需要记录：

- 成员数量

以下使用 `Member<Idx>` 是为了后续能够使用宏生成，且能够遍历。

```cpp
template <typename T> struct TypeInfo;
template <> struct TypeInfo<Point> {
  typedef Point ClassType;
  template <size_t Idx> struct Member {};

  template <> struct Member<0> {
  public:
    // 成员类型
    typedef decltype(ClassType::x) MemberType;
    // 成员名
    static constexpr auto name = ConstStr("x");
    // 成员指针
    static constexpr auto pointer = &ClassType::x;
  };
  // 便于构造属性 x 的元信息
  static constexpr Member<0> x() { return {}; }

  // 成员数量
  static constexpr size_t memberCount = 1;
};
```

## 反射读写

有了元信息的读取结构就可以实现反射读写方法。

```cpp
// 读方法，如 get(pt, TypeInfo<Point>::x())
template <typename C, typename M> constexpr static auto get(const C &obj, M) {
  constexpr auto pointer = M::pointer;
  return obj.*pointer;
}

// 写方法，如 set(pt, TypeInfo<Point>::x(), 1.f)
template <typename C, typename M>
constexpr static void set(C &obj, M, const typename M::MemberType &val) {
  constexpr auto pointer = M::pointer;
  obj.*pointer = val;
}
```

## forEach

定义空的结构体 `TypeList` 用于承载元信息列表。

```cpp
template <typename... T> struct TypeList {};
```

由于成员元信息使用 `Member<Idx>` 记录，同时已知成员数量 `memberCount`，因此可以使用 `std::index_sequence` 获取成员列表。

```cpp
template <typename C> constexpr static auto getMembers() {
  constexpr auto seq = std::make_index_sequence<TypeInfo<C>::memberCount>();
  return getMembers<C>(seq);
}
template <typename C, size_t... Idx>
constexpr static TypeList<Member<C, Idx>...>
getMembers(std::index_sequence<Idx...>) {
  return {};
}
```

这样就可以通过已获取的成员列表实现遍历方法。

```cpp
template <typename C, typename F> constexpr static void forEach(F &&f) {
  forEach(getMembers<C>(), std::forward<F>(f));
}

template <typename F, typename... Ts>
constexpr static void forEach(TypeList<Ts...>, F &&f) {
  forEach(TypeList<Ts...>{}, std::make_index_sequence<sizeof...(Ts)>(),
          std::forward<F>(f));
}
template <typename F, typename... Ts, typename T, size_t... Idx, size_t I>
constexpr static void forEach(TypeList<T, Ts...>,
                              std::index_sequence<I, Idx...>, F &&f) {
  // 生成 T 类型对象并调用 callback
  f(T{});
  forEach(TypeList<Ts...>{}, std::index_sequence<Idx...>{},
          std::forward<F>(f));
}
template <typename F>
constexpr static void forEach(TypeList<>, std::index_sequence<>, F &&) {}
```

以下是对 `Point` 使用 `forEach` 的例子。

```cpp
// 遍历全部属性
void example_iterateAllProps() {
  Point pt{.x = 1, .y = 2, .z = 3};
  Reflect::forEach<Point>([&](auto member) {
    std::cout << member.name.data() << ":" << Reflect::get(pt, member)
              << std::endl;
  });

  // Output:
  // x:1
  // y:2
  // z:3
}

// 遍历部分属性
void example_iterateSomeProps() {
  typedef TypeInfo<Point> T;
  // 将需要的属性组成 TypeList
  constexpr TypeList<decltype(T::x()), decltype(T::z())> props;
  Point pt{.x = 1, .y = 2, .z = 3};
  Reflect::forEach(props, [&](auto member) {
    std::cout << member.name.data() << ":" << Reflect::get(pt, member)
              << std::endl;
  });

  // Output:
  // x:1
  // z:3
}
```

## 宏生成元信息

将之前手写 `TypeInfo` 与 `Member` 的地方转为宏生成以方便使用。宏的实现如下：

```cpp
#define REFLECT_BEGIN(Type)                                                    \
  template <> struct TypeInfo<Type> {                                          \
    typedef Type ClassType;                                                    \
    template <size_t Idx> struct Member {};                                    \
    static constexpr size_t fieldOffset = __COUNTER__;

#define REFLECT_FIELD(Field)                                                   \
  static constexpr size_t MEMBER_##Field##_OFFSET = __COUNTER__;               \
  template <> struct Member<MEMBER_##Field##_OFFSET - fieldOffset - 1> {       \
  public:                                                                      \
    typedef decltype(ClassType::Field) MemberType;                             \
    static constexpr auto name = ConstStr(#Field);                             \
    static constexpr auto pointer = &ClassType::Field;                         \
  };                                                                           \
  static constexpr Member<MEMBER_##Field##_OFFSET - fieldOffset - 1> Field() { \
    return {};                                                                 \
  }

#define REFLECT_END                                                            \
  static constexpr size_t memberCount = __COUNTER__ - fieldOffset - 1;         \
  };
```

其中的关键是 `Member<Idx>` 与 `memberCount` 如何生成的问题。这里用到了内置宏 `__COUNTER__`，其初值为 0，每预编译一次会自增 1。那么在开始时记录下其值，最后再记录一次就能够算出成员数量，每次定义成员元信息记录其值能够算出自增值。

对 `Point` 使用宏生成元数据信息：

```cpp
REFLECT_BEGIN(Point)
  REFLECT_FIELD(x)
  REFLECT_FIELD(y)
  REFLECT_FIELD(z)
REFLECT_END
```
