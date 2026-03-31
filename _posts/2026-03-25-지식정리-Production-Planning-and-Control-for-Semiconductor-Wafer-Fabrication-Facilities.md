---
date: 2026-03-25 00:00:00 +0900
layout: post
title: 지식정리 - Production Planning and Control for Semiconductor Wafer Fabrication Facilities
categories: 지식정리
---

# Contents

- TOC
  {:toc}

## preface

- Wafer fabrication이 복잡한 이유
	- Reentrant flow : 노광 장비가 고가이기 때문에 식각, 증착 과정에서 동일한 장비를 하나의 Wafer(job)이 여러 번 통과함
	- Customer due date이 매우 aggressive함
	- 다른 제품 만드려고 할 때 lead time에서 setup time이 차지하는 비율이 큼

- Semiconductor manufacturing system
	- base system (BS): 모든 resources를 포함한 개념
		- base process : jobs들이 resources를 소비하며 처리되는 것
	- production control system : production control instructions를 생산하기 위한 컴퓨터와 소프트웨어
		- production control process

- PPC (Production Planning and Control) hierarchy
	- Planning(months or years) : Enterprise level에서 장기 수요를 예측
	- Order release(weekly) : planning을 바탕으로 생산 용량을 할당
	- Scheduling(shift or day) : 시간 흐름에 따라 resource를 할당
	- Dispatching(minute-by-minute) : 실시간 resource의 상황에 따라 job 간의 우선순위를 정하거나 할당

- scheduling
	- deterministic : processing time, setup time, job priority가 확정적
		- static : 모든 작업이 t=0일 때 가용 상태
		- dynamic : 작업 마다 가용 시간이 다름
	- stochastic : 확정적이지 않고 확률 분포를 따름

반도체 공장의 많은 스케줄링 문제는 NP-hard라서 heuristic 또는 강화학습 알고리즘을 사용함  


## Semiconductor Manufacturing Process Description

- Front-end
	- Wafer Fab
	- Sort(Probe)
- Back-end : 주로 노동비가 싼 국가에서 이뤄짐
	- Assembly : dicing saw, die attach, wire bonding, lid sealing, packaging, molding
	- Test : wafer sort와 비슷한 검사, load board에 올려서 heat-stress test
		- tester(test system)
		- handler(loading mechanism)

- performance measures
	- utilization : 장비 가격이 매우 비싸서 중요한 지표임
	- production yield
	- throughput
	- cycle time : job(a fixed number of wafers)이 공정에 머무는 시간
	- on-time delivery performance

- Basic Framework for PPC
	- system : 서로 상호작용하는 components의 집합
		- 각 component는 고유의 state를 가짐
	- process : events 집합에서 actions 집합으로의 mapping
		- event에 따른 action은 system component에서 수행됨
		
- manufacturing system : 상품을 생산하기 위한 목적을 가진 system으로 BS와 IS로 구성됨
	- Base system(BS) : raw materials이나 intermediate products를 final products로 변환하는 system components로 구성됨
		- Subsystems
			- Job processing system(JS) : working objects(i.e. jobs)의 value-added processing을 가능하게 하는 system components로 구성됨
				- 여러 work area(bay)로 구성되며 work area는 work center(tool groups)의 집함임. work center(tool groups)는 비슷한 처리를 하는 machines의 집합임.
			- Material flow system(MS) : raw materials, working objects, auxiliary를 저장하거나 옮기고 공급하는 시설로 구성됨
		- Base process : process flows(routes)와 working objects 집합으로 구성됨. working objects에 의한 BS의 system components의 사용에 대해 다룸
			- process flow : process steps으로 구성된 sequence로 각 process step에는 possible machines의 집합이 할당되고 각 machine에는 recipe이라고 불리는 execution program이 대응됨
	- Information system(IS) : production control을 하는 시스템으로 각 하위 subsystem은 instructions과 feedback을 통해 상호작용함
		- Planning system (PS) : 컴퓨터와 소프트웨어 집합으로 구성되며 production planning instructions인 mp를 결정하는데 사용되며, 이에 따라 working objects를 BS에 언제 어느 정도 투여할 지 결정함.
			- production planning process(PP)는 어떤 상황에서 어떤 production planning actions이 수행되어야 하는지 결정함.
		- Control system (CS) : 컴퓨터와 소프트웨어 집합으로 구성되며 BP에 영향을 주는 production control instructions mc를 결정하는데 사용되며, 이에 따른 production control decisions은 이미 BP의 일부인 working objects에만 영향을 줌. 
			- control process (CP) : 특정 production control algorithm을 통해 어떤 상황에서 어떤 production control instructions을 사용할지 결정함
		- Operational system (OS) : 하드웨어와 소프트웨어 집합으로 구성되며 BP의 긴급 제어를 담당함. BS와 BP의 mirror처럼 작동하며 데이터베이스를 통해 구현됨.
		- Human decision makers

### Base system

#### Job processing system

- JS를 이루는 machines
	- batch machine : batch 단위로 처리를 하는 machine
	- pipeline tools : first job이 끝나기 전에 second job을 시작할 수 있는 machine
	- X-piece machine : batch size 보다 작은 X개 wafer를 처리할 수 있는 machine
	- cluster tools : 진공 환경에서 wafer-handling robot을 통해 처리하는 machines
		- 동일한 recipe를 요구하는 jobs은 순차적으로 처리(pipelining)하고 아니면 병렬 처리도 가능

#### Material flow system

300mm wafer fabs에서는 wafers나 reticle이 AMHS를 통해서 FOUPs(안이 질소 포장됨)을 통해 이동함. FOUPs이 너무 많으면 AMHS에 과부화를 줄 수 있어서 무조건 많아서 좋은 것은 아님.  

- Interbay systems(=Interbay MS) : bay 간의 transport를 하는 system
	- 구성 요소
		- carrier
		- stocker(i.e. high-rack storage area) : wafers나 reticle을 저장
			- load ports가 있어서 carrier에 load하거나 unload할 수 있음
		- transportation system : stocker와 stocker 사이 또는 stocker와 interlevel lift system 사이에 수송을 담당
			- e.g. overhead transport, floor running AGV(automated guided vehicle)
- Intrabay systems(=Intrabay MS) : bay 내부에서 transport를 하는 system
	- 구성 요소
		- carrier
		- stocker : stocker와 machine의 거리가 멀기 때문에 이동 시간 동안 overhead가 발생하고 이를 피하기 위해서 UTS(under track storage)라는 single buffer에 미리 옮겨 놓음. machine의 load ports도 primary buffer 역할을 하고 보통 기계 마다 3-4개 ports가 있음
		- transportation system : stock와 machine 또는 machine과 machine 사이의 수송을 담당
			- e.g. 주로 OHV(overhead hoist vehicle, =OHT), AGV, RGV
	- 사용되는 Configuration이 크게 두 가지가 있음
		- unified transport configuration : interbay systems이랑 intrabay systems이 통합되어 있는 형태로 서로 옮겨 갈 때 stocker에서 load와 unload를 할 필요가 없음 (track elevation이 같아야 함)
		- non-unified transport configuration : 서로 분리된 형태 (track elevation이 다를 수 있음)

### Base process

- Work areas
	- Oxidation/diffusion : Oxidation은 산화막을 만드는 과정이고 diffusion은 furnace를 통해서 wafer 표면의 물질을 퍼지게 하는 과정
	- Photolithography : scanner가 비싸기 때문에 typical bottleneck임
		- coating : photoresist strip을 wafer에 코팅
		- exposure : exposure tools(scanner)을 통해서 reticle의 패턴을 wafer 위에 노출
		- developing : polymerized section이 제거되는 과정 
	- Etch : photoresist strip이 덮히지 않은 부분이 wafer에서 제거되는 과정으로 wet etch와 dry etch로 구분됨.
	- Ion implantation : etched된 부분에 doping material이 증착됨
	- Film deposition : dielectric(절연체) 또는 metal layer를 wafer 위에 증착하는 과정으로 PVD(physical vapor deposition), CVD(chemical vapor deposition), epitaxy, metallization이 사용됨
	- Planarization(=CMP; Chemical-Mechanical polishing) : slurry를 통해 wafer surface를 깍아서 평탄화하는 과정

Oxidation, diffusion, deposition 과정 진입 전에 cleaning step이 수행되며 job이 work area 사이에 옮겨 갈 때 inspection이나 measurement step이 수행됨  

특정 process step을 수행할 때 wafer가 damaged 될 수 있는데 rework를 통한 repair가 불가능한 경우의 wafer를 scrapped material이라고 부름  

- yield : electrical specifications을 만족하는 wafers의 비율

- job shop : 개별 제품 별로 필요한 공정이 다른 경우 (보통 공정 단계는 적음)
- flow shop : 모든 제품들이 fixed machine sequence를 따라서 처리되는 경우

반도체 제조는 고가의 장비 때문에 re-entrant flow가 필요하고 공정 단계가 매우 많기 때문에 전통적인 job shop이나 flow shop과 차이점이 있음 (하나의 장비를 두고 서로 다른 stage에 있는 job끼리 경쟁을 해야됨)  

어떤 공정은 금방 처리되지만 어떤 공정은 몇 시간이 걸리기도 하고 batch machine부터 한 번에 하나의 wafer만 처리할 수 있는 machine까지 다양함    


```mermaid
graph TD
RawWafer((Raw Wafer/<br/>Wafer Start))
ProcessedWafer((Processed<br/>Wafer))
BackEnd[Sort, Assembly,<br/>Final Test]

subgraph FrontEnd [Front-end]
direction TB
Oxidation[Oxidation/<br/>Diffusion]
Film[Film Deposition]
Planarization[Planarization]
Lithography[Photo-lithography]
Etch[Etch]
Ion[Ion Implantation]

Oxidation <--> Film
Oxidation <--> Lithography
Ion --> Oxidation
Film <--> Planarization
Lithography <--> Etch
Lithography <--> Ion
Etch --> Planarization
Etch <--> Oxidation
Planarization --> Lithography
end

RawWafer --> Oxidation
Oxidation --> ProcessedWafer
ProcessedWafer --> BackEnd

style FrontEnd fill:#f9f9f9,stroke:#333,stroke-width:2px
style RawWafer fill:#fff,stroke:#333
style ProcessedWafer fill:#ccc,stroke:#333
```

- multiple orders per job problem : batch machine에서는 order 마다 POUPs을 사용하기 보다는 적절히 합친 다음 batch 단위로 처리하는 것이 효율적임. 그래서 서로 다른 customers의 order를 group화 해서 production jobs을 형성할 필요가 있음.     

- 어려운 점들
	- 반도체 생산 장비는 기계가 완전 고장나는 hard failure는 드물고 기계는 돌아가는데 기준치를 벗어난 생산을 하는 soft failure가 발생하는 경우가 대부분임. 그래서 inspection step이 중요하고 preventive maintenance operations과 prototype jobs도 필요한데 capacity가 줄어들기 때문에 trade-off 관계임.     
	- 우선순위가 높거나 due date이 촉박한 hot jobs(rocket jobs)이 있으면 혼잡성이 더 올라감.  
	- time windows가 지나 버려서 wafer가 산화되거나 오염되면 rework를 해야될 수도 있고 scrapped material이 될 수도 있음
		- time windows(Q-Time) : 특정 공정에서 다음 공정까지 허용되는 최대 제한 시간
	- sequence-dependent setup times : 이전에 어떤 작업을 했냐에 따라 setup time이 달라질 수 있음 e.g. ion implantation에서 이전에 어떤 dopant를 사용했냐에 따라 다음 작업 setup time이 달라질 수 있음

### Production Planning and Control Hierarchy

production planning은 time bucket 단위로 이뤄지며 planning decisions의 결과는 특정 bucket 내에 생산되어야 할 물량임. Planning level에서는 주로 매출이 measure로 고려됨   

#### PS
##### Planning

- planning의 종류
	- (long-term) capacity planning : enterprise level에서 다음 연도들의 생산량과 product mix를 결정하는 것
	- master planning(supply network planning) : capacity planning을 바탕으로 time buckets이나 facility에 물량을 할당하는 것
  
- PP의 performed manner
	- event-driven : BS의 state나 BP의 event를 고려해서 새로운 계획을 수립하는 방법.
	- time-driven (rolling horizon) : 상황을 고려하지 않고 주기적으로 계획을 수립하는 방법. h가 planning decision을 고려하는 전체 기간이라고 하면, $\tau_\Delta$는 계획이 BS, BP에서 실행되는 planning interval이고 $\tau_{ah}$는 additional planning horizon임     $$h:=\tau_\Delta +\tau_{ah} $$
	- hybrid : 혼합된 형태

##### Order release

- Order release : planning에 따른 decision을 바탕으로 quantities를 분할하는 과정
	- 보통 weekly or bi-weekly 수행하며 결과로 특정 시간에 처리되어야 할 jobs 집합이 나옴.  
	- Order release는 Fab의 load나 cycle time에 영향을 주고 planning decision에도 영향을 줄 수 있음.  

##### Scheduling

- scheduling : 각 job을 적절한 time intervals과 알맞은 resources를 할당하는 과정으로 특정 objective를 최적화하는 것이 목표임
	- 이미 BS에 release된 jobs만을 대상으로 하며 보통 day or shift 간격으로 수행
	- scheduling의 대상은 BS의 work area, work center, 또는 single machine이 될 수도 있고 MS의 vehicle이 될 수도 있음

##### Dispatching

- dispatching : JS나 MS의 resources에서 서비스를 대기 중인 jobs 집합 중에서 다음으로 처리될 job을 할당하는 과정.
	- schedule을 바탕으로 한 priority를 고려하거나 feasible schedule이 없으면 dispatching rule에 따라 결정하며 minute by minute으로 수행

#### others

- OS : BS나 BP에서 나온 데이터를 모으는 역할을 함
	- ERP는 planning decision을 돕는 소프트웨어
	- MES는 JS와 관련된 production control decision이나 AMHS control 같은 MS 관련 decision을 내릴 때 사용하는 소프트웨어
	- 근데 요즘은 더 발전된 APS같은 소프트웨어를 사용함
  
## Modeling and Analysis Tools



## Dispatching Approaches

## Deterministic Scheduling Approaches

## Order Release Approaches

## Production Planning Approaches



## State of the Practice and Future Needs for Production Planning and Control Systems

