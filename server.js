const express = require("express");
const app = express();
const router = express.Router();
const redis = require("redis");
const socketIO = require("socket.io");
let dhcpUrl = "redis://localhost:6379";
const client = redis.createClient({
  // socket: {

  //  host: "192.168.1.100",

  //  port: 6379

  //  }
  url: dhcpUrl,
});

//pub /sub 연습 나도뭔지 일단 몰라..

// let eventName = "greeting";
// class Publisher {
//   constructor() {}

//   publishMessage() {
//     let message = "hello";
//     eventsEmitter.emit(eventName, message);
//   }
// }
// class Subscriber {
//   constructor() {
//     eventsEmitter.on(eventName, (greeting) => {
//       console.log("Someone sent me a greeting: " + greeting);
//     });
//   }
// }
class Redis {
  constructor() {
    this.redisClient = redis.createClient({
      url: dhcpUrl,
    });
    //    this.redisClient.on('connect', () => {
    //       console.info('Redis PubSub connected!');
    //    });
    this.redisClient.on("error", (err) => {
      console.error("Redis PubSub Client Error", err);
    });

    // redis v4 연결 (비동기)
    this.redisClient.connect().then(() => {
      console.log("Redis PubSub connected!");
    });
  }

  // 이밖의 명령어 ...
}

class PubSub extends Redis {
  constructor() {
    super();
  }

  async subscribe(channel) {
    await this.redisClient.subscribe(channel, (message) => {
      console.log("Line 75 message : ", message);
    });
    console.log("채널 연결 완료");
  }

  async unsubscribe(channel) {
    await this.redisClient.unsubscribe(channel);
  }

  async pSubscribe(channel) {
    await this.redisClient.pSubscribe(channel, (message, channel) => {
      console.log("channel : %s , message : %s", channel, message);
    });
    console.log("채널(패턴) 연결 완료");
  }

  async pUnsubscribe(channel) {
    await this.redisClient.pUnsubscribe(channel);
  }

  async publish(channel, message) {
    await this.redisClient.publish(channel, message);
  }
}

// 아래 함수 on 은 에러남 쓰지마셈 . client.on()이거 자체가 리스너 패턴인듯 promise객체 사용 x
// 아직 리스너 안익숙해서 패스
// async function on(){
//     await client.on('connect').then(()=> {
//         console.log("L64 on promise 이용 ,redis 연결됨");
//     })
// }

async function run() {
  await client.connect().then(() => {
    console.log("redis 연결됨");
  });
}

run();

client.on("connect", () => {
  console.info("Redis connected");
});
client.on("error", (err) => {
  console.error("Redis Client Error", err);
});

//  client.connect().then();

//   async function run() {

//     await client.connect();

//     const value = await client.get("test-key");
//     console.log(value);

//   };

//   run();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
const server = app.listen(8080, function () {
  console.log("listening on port 8080");
});

app.post("/test", function (req, res) {
  console.log(req.body);
  if (req.body != null) {
    console.log("받은 데이터 ->", req.body.sender);
    console.log("받은 데이터 ->", req.body.roomNum); //클라이언트 통신  확인 끝!

    async function job1(req) {
      return await client
        .set(`${req.body.sender}`, `${req.body.roomNum}`)
        .then((e) => {
          //     if(e==okay){
          //     console.log("L97 e값 ==>> ",e);
          //     return Promise.reject("L98 set 분기처리. Promise.reject 발생.")
          // }
          console.log("L127 set 함수 리턴값 : ", e);
          return Promise.resolve("L102 Promise.resolve리턴");
        });
    }
    job1(req)
      .then((e) => {
        console.log("L133 데이터 저장완료", e);
      })
      .catch((e) => {
        console.log("L136  데이터 저장실패 ", e);
      });

    async function job2(req) {
      return await client.get(`${req.body.sender}`).then((e) => {
        console.log("L121 성공시 받은값-> ", e);
        if (e != null) {
          console.log("debug Line 120");
          return Promise.resolve("redis get 성공");
        }
      });
    }
    job2(req)
      .then((e) => {
        console.log(e);
      })
      .catch((e) => {
        console.log("에러처리되나", e);
      });

    console.log("얘가 그래도 더 빠르겠지");
  }

  // 클라이언트가 보낸 요청(req.body)에 데이터가 null일떄
  else {
    console.log("null뜸");
    res.send("We didn't get your request properly.");
  }
});

const subscriber = new PubSub(); // 구독자
const publisher = new PubSub(); // 발행자
//psub 연결 생성.
//FLOW9
app.post("/psub", async (req, res, next) => {
  console.log(Object.keys(req.body));
  let patternSubscribe = {};
  for (const key in req.body) {
    if (Object.hasOwnProperty.call(req.body, key)) {
      const element = req.body[key];
      console.log("Line 250 /psub에서 받은 값 :" + element);
    }
  }
  //FLOW10 관제 웹이 보낸 과제를 할 채널정보를 patternSubscribe 오브젝트에 저장한거임.
  patternSubscribe["도시"] = req.body.sender;
  patternSubscribe["구"] = req.body.roomNum;
  //FLOW11
  // Line 188에있는 subscriber 레디스 객체를 이용해 node.js에서 redis에 채널을 구독.(연결)
  //다음 FLOW12 는 subscriber.html에 있음
  await subscriber.pSubscribe(
    `/${patternSubscribe["도시"]}/${patternSubscribe["구"]}*`
  ); // 채널 생성 & 구독

  res.end();
});

app.post("/unsub", async (req, res, next) => {
  await subscriber.unsubscribe("me"); // 구독 해제
  res.end();
});

app.post("/pub", async (req, res, next) => {
  await publisher.publish(
    `/${req.body.sender}/${req.body.roomNum}`,
    "hello world"
  ); // 채널에 메세지 송신
  res.end();
});

// app.post("pub", async (req, res, next) => {
//   await publisher.publish(`req`, "Hello pattern subscribe");
// });

//FLOW14 클라이언트로 부터 SSE 요청받음
app.get("/message/:city/:district", async function (req, res) {
  //FLOW15 관제웹의 SSE연결을 위한 최초요청시에 res.writeHead를 아래와 같이 보내서 노드서버와 관제웹의  연결을 유지시킴
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  // 관제웹으로 받은 구독할 채널 정보 확인 , 출력
  console.log("Line 243 " + req.params.city);
  console.log("Line 244 " + req.params.district);
  // 연결후 node.js에서 관제웹으로 push하는 예제
  res.write("event: test\n");
  res.write(
    `data: ${"초기연결 완료 , 재연결시에도 발생하는 메세지입니다."}\n\n`
  );
  //함수선언 시작
  //FLOW16
  // 함수 선언 시작 , node.js서버에서 redis에 채널 구독하는 함수.
  (async (city, district, res) => {
    const client = subscriber.redisClient;
    // 원본 subscriber 소켓 디스크럽터를 복사
    const localSubscriber = client.duplicate();
    // 복사된 소켓디스크럽터로 연결
    await localSubscriber.connect();
    //FLOW17 복사된 소켓 디스크럽터로 채널 구독 , 구독한 채널로 데이터가 전송(publish)될 경우 아래 함수가 실행됨.
    //다음 FLOW18 은 subscriber.html에 있습니다.
    await localSubscriber.pSubscribe(`/${city}/${district}*`, (message) => {
      console.log("message오니..?");
      res.write("event: test\n");
      res.write(`data: ${message}\n\n`);
    });
    // 함수선언끝
  })(req.params.city, req.params.district, res); //여기서 함수 실행 res는 관제웹에 데이터를 보내주기 위해 매개변수로보냄.
});

//FLOW4
// publisher 가  소켓연결시에 실행되는 코드.
const io = socketIO(server, { path: "/socket.io" });
//FLOW5 연결이된 상태일 경우이벤트 = "connection"임
io.on("connection", (socket) => {
  // connection 콜백함수 시작

  socket.on("disconnect", () => {
    console.log("publisher 접속 헤제");
    clearInterval(socket.interval);
  });

  socket.on("error", (error) => {
    console.error(error);
  });

  //FLOW6 클라이언트로부터 메시지 수신 FLOW7은 Subscriber7에 있습니다.
  socket.on("currentGps", (data) => {
    console.log(data);
    console.log(typeof data);

    let parsedJsonData = JSON.parse(data);
    console.log(parsedJsonData);
    let 도시 = parsedJsonData["도시"];
    let 지역구 = parsedJsonData["지역구"];
    let 동 = parsedJsonData["동"];
    let gps = parsedJsonData["gps"];
    let 라이더이름 = parsedJsonData["라이더이름"];
    console.log("배달라이더분들한태온 gps정보 -> ", gps);
    //data == gps임 gps가 1이면 범어동

    (async (publisher) => {
      const client = publisher.redisClient;
      const localSubscriber = client.duplicate();

      await localSubscriber.connect();

      await publisher.publish(
        `/${도시}/${지역구}/${동}`, // <--- ex) /대구시/수성구/범어동 == 채널임 , 이거 전체가 하나의 체널임.
        `라이더 지역정보 : ${도시}_${지역구}_${동} 라이더이름 : ${라이더이름}} 라이더 gps : ${gps}` // <----- /대구시/수성구/범어동(채널) 에 보낼 메세지임.
      );
      // 함수선언끝
    })(publisher);

    // if (data == 1) {
    //   (async (publisher) => {
    //     const client = publisher.redisClient;
    //     const localSubscriber = client.duplicate();

    //     await localSubscriber.connect();

    //     await publisher.publish(
    //       "/대구시/수성구/범어동", // <--- /대구시/수성구/범어동 == 채널임 , 이거 전체가 하나의 체널임.
    //       "대구시,수성구,범어동 라이더임~~" // <----- /대구시/수성구/범어동(채널) 에 보낼 메세지임.
    //     );
    //     // 함수선언끝
    //   })(publisher); //여기서 함수 실행
    // } else {
    //   (async (publisher) => {
    //     const client = publisher.redisClient;
    //     const localSubscriber = client.duplicate();

    //     await localSubscriber.connect();

    //     await publisher.publish(
    //       "/서울시/종로구/익선동", // line 286,287 설명그대로입니다!
    //       "서울시,종로구,익선동 라이더입니다~"
    //     );
    //     // 함수선언끝
    //   })(publisher); //여기서 함수 실행
    // }

    // connection 콜백함수 끝
  });

  socket.emit("test", "Hello socket.IO from server"); //형준알제???
});

// publisher 에서 요청하는 코드 끝

//정적 파일 처리입니다.
app.get("/subscriber", function (req, res) {
  res.sendFile(__dirname + "/subscriber.html");
});

app.get("/publisher", function (req, res) {
  res.sendFile(__dirname + "/publisher.html");
});

app.get("/css/style.css", function (req, res) {
  res.sendFile(__dirname + "/css/style.css");
});

app.get("/img/profile.png", function (req, res) {
  res.sendFile(__dirname + "/img/profile.png");
});
