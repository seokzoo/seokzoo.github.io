---
date: 2025-10-07 00:00:00 +0900
layout: post
title: 지식정리 - DeepMind x UCL RL
categories: 지식정리
---

# Contents

- TOC
  {:toc}

# Introduction

- environment : dynamics of the problem
- reward hypothesis : 어떤 goal 이든 cumulative reward를 maximizing하는 것으로 formalize할 수 있다
- reward($R_t$) : scalar feedback signal
- return($G_t=R_{t+1}+R_{t+2}+\cdots$) : cumulative reward
- value($v(s)=\mathbb{E}[G_t\mid S_t=s]$) : expected cumulative reward
- action value($q(s,a)=\mathbb{E}[G_t\mid S_t=s, A_t=a]$) : conditional value on actions
- Goal : maximize value by picking suitable actions
- history($\mathcal{H}_t=O_0,A_0,R_1,O_1,\cdots,O_{t-1},A_{t-1},R_t,O_t$) : the full length of observations, actions, rewards
- agent의 요소 : agent state, policy, value function, model
- agent state($S_t$) : environment로 부터 얻은 observation($O_t$)과 agent 내부의 정보를 조합한 것으로 agent가 action을 결정할 때 참조하는 정보
- Markov property : $p(S_{t+1}=s^\prime\mid S_t=s)=p(S_{t+1}=s^\prime\mid h_{t-1},S_t=s)$ where h is all possible histories
- Markov decision process : agent state($S_t$)에 history로 알 수 있는 정보가 다 포함되어 있는 decision process $$ p(r,s\mid S_t,A_t)=p(r,s\mid \mathcal{H}\_t,A_t)$$
  - MDP는 tule로 나타낼 수 있음 (S, A, p, r, $\gamma$)
    - S : all possible states
    - A : all possible actions
    - $p(s^\prime\mid s,a)$
    - $r = \mathbb{E}[R\mid s,a]$
    - $\gamma$ : discount factor
  - e.g. full history를 state로 정의하면 Markovian이 됨
- POMDP : environment state != observation인 상황. observation은 Markovian이 아니지만 history에 대한 함수 agent state를 잘 정의하면 Markovian이 될 수도 있음
  - e.g. $S_{t+1}=u(S_t,A_t,R_{t+1},O_{t+1})$ where $u$ is a state update function
- policy($A=\pi(S)$ or $\pi(A\mid S)=p(A\mid S)$) : mapping from agent states to actions
- value function : return에 discount factor $\gamma\in [0,1]$를 도입해서 $G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2 R_{t+3}+\cdots$ $$\begin{matrix}v_\pi(s)&=&\mathbb{E}[G_t\mid S_t=s, \pi]\\&=&\mathbb{E}[R_{t+1}+\gamma v_{\pi}(S_{t+1})\mid S_t=s, A_t\sim \pi(s)]\end{matrix}$$
  - optimal value : $v_\ast (s)=\operatorname*{max}_a\mathbb{E}[R_{t+1}+\gamma v_\ast(S_{t+1})\mid S_t=s, A_t=a]$
  - $v_\pi(s)=\sum_a \pi(a\mid s)q_\pi(s,a)$
- model : environment가 다음에 뭘 할지(next state, next reward) 예측
  - e.g. $\mathcal{P}(s,a,s^\prime)\approx p(S_{t+1}=s^\prime\mid S_t=s,A_t=a)$, $\mathcal{R}(s,a)\approx \mathbb{E}[R_{t+1}\mid S_t=s,A_t=a]$
- agent categories
  - Value based : value function 기반
  - Policy based : policy 기반
  - Actor Critic : policy, value function 기반
- agent categories
  - model free : model 필요없음
  - model based : model 필요
- subproblems of reinforcement learning
  - prediction : evaluate the future for a given policy
  - control : find the best policy
  - learning : environment를 모르는 상태에서 시작하는 문제로 optimal policy나 model을 학습
  - planning : environment의 model이 주어졌거나 학습되었을 때 external interaction없이 model을 이용해 planning하는 것
- learning agent components : policies value functions, models, state update functions(state updates)

# Exploration and Exploitation

- Exploration : increase knowledge
- Exploitation : maximize performance based on current knowledge
- regret : $\Delta_a=v_\ast(s)-q(s,a)$
  - total regret : $\sum_{n=1}^t\Delta_{A_n}=\sum_{a\in\mathcal{A}}N_t(a)\Delta_a$
  - large action regrets $\Delta$의 action counts $N_t$를 줄이는게 좋다
- Lai & Robbins theorem에 따르면 아무리 지능적인 학습 알고리즘도 exploration을 해야하기 때문에 total regret이 $\log t$에 비례하여 누적될 수 밖에 없음

## Policies

### policy gradient based on action preferences $H_t(s, a)$

$$\begin{aligned}\pi(s,a)=\frac{e^{H_t(s,a)}}{\sum_b e^{H_t(s,b)}}\\ \theta\leftarrow \theta+\alpha \nabla_\theta \mathbb{E}[G_t\mid \pi_{\theta}] \end{aligned}$$

- action preferences : learnable parameters
- How to compute this gradient : Log-likelihood trick $$\begin{flalign}\nabla_\theta\mathbb{E}[G_t\mid \pi_\theta]&=\nabla_\theta \sum_{a,s} \pi_\theta(a,s)\mathbb{E}[G_t\mid S_t=s, A_t=a]\\&= \sum_{a,s}q(s,a)\nabla_\theta\pi_\theta(a,s)\\&=\sum_{a,s}q(s,a)\frac{\pi_\theta(a,s)}{\pi_\theta(a,s)}\nabla_\theta\pi_\theta(a,s)\\&=\sum_{a,s}q(s,a)\pi_\theta(a,s)\nabla_\theta\log \pi_\theta(a,s)\\&=\mathbb{E}_{\pi_\theta}[G_t\nabla_\theta\log \pi_\theta(a,s)]\\\therefore \theta&\leftarrow \theta +\alpha G_t\nabla_\theta\log \pi_\theta(a,s) \end{flalign}$$

### UCB (Upper Confidence Bound)

- 어떤 action value의 uncertainty가 클수록 exploration을 해봐야하고 uncertainty가 크다는 것은 $N_t$가 낮다는 것
- Upper confidence $U_t(s,a)$는 $q(s,a)\le Q_t(s,a)+U_t(s,a)$를 높은 확률로 만족하는 값을 의미함
- UCB를 최대로 만드는 action을 선택하는 것도 policy가 될 수 있음 $$a_t=\operatorname*{argmax}_{a\in\mathcal{A}}Q_t(s,a)+U_t(s,a) $$
- action 마다 reward가 바로 확정되는 경우에는 Hoeffding's inequality를 사용해서 upper confidence를 계산할 수 있음 e.g. multi-armed bandit problem

### Bayesian approaches

### Thompson sampling

# Markov Decision Processes and Dynamic Programming

- 모든 MDP 문제는 하나 이상의 deterministic optimal policy가 존재함
- Bellman equations $$\begin{flalign}v_\pi(s)=\sum_a \pi(s,a)\{r(s,a)+\gamma \sum_{s^\prime}p(s^\prime\mid s,a)v_\pi(s^\prime)\}\\q_\pi(s,a)=r(s,a)+\gamma\sum_{s^\prime}p(s^\prime\mid s,a)\sum_{a^\prime}\pi(a^\prime\mid s^\prime)q_\pi(s^\prime,a^\prime) \end{flalign}$$
- Bellman optimality equations $$\begin{flalign}v_\ast(s)= \max_a \{r(s,a)+\gamma \sum_{s^\prime}p(s^\prime\mid s,a)v_\ast(s^\prime)\}\\ q_\ast(s,a)=r(s,a)+\gamma \sum_{s^\prime} p(s^\prime\mid s,a)\max_{a^\prime} q_\ast(s^\prime,a^\prime)\end{flalign}$$
- policy evaluation (prediction) : estimating $v_\pi,q_\pi$
- control (policy optimization) : estimating $v_\ast,q_\ast$
- Bellman equation in matrix form $$\begin{flalign}v=r^\pi+\gamma P^\pi v\\ (I-\gamma P^\pi)v=r^\pi\\v=(I-\gamma P^\pi)^{-1}r^\pi \end{flalign}$$
  - $v_i=v(s_i)$
  - $r_i^\pi=\mathbb{E} [R_{t+1}\mid S_t=s_i, A_t\sim \pi(S_t)]$
  - $P_{ij}^\pi=p(s_j\mid s_i)=\sum_a \pi(a\mid s_i)p(s_j\mid s_i, a)$
- Bellman optimality equation은 non-linear라서 바로 해를 구할 수가 없고 다른 방법을 사용해야함

## Dynamic programming을 이용한 풀이법

- DP를 이용한 control 방법은 policy evaluation과 policy improvement로 구성됨
- policy iteration (policy evaluation + policy improvement)
  - policy evaluation $$v_{k+1}(s)\leftarrow\mathbb{E}[R_{t+1}+\gamma v_k(S_{t+1})\mid s,\pi] $$
    - 모든 $s$에 대해서 $v_{k}(s)=v_{k+1}(s)$가 될 때까지 진행
  - policy improvement $$\pi_{new}(s)=\operatorname*{argmax}_{a}\mathbb{E}[R_{t+1}+\gamma v_{old}(S_{t+1})\mid S_t=s,A_t=a] $$
    - generate $\pi_{new}\ge\pi_{old}$
- value iteration : iteration step = 1인 policy evaluation이면서 policy improvement를 한 번에 해결 $$v_{k+1}(s)\leftarrow \max_a\mathbb{E}[R_{t+1}+\gamma v_k(S_{t+1})\mid S_t=s,A_t=a] $$
  - 모든 $s$에 대해서 $v_{k}(s)=v_{k+1}(s)$가 될 때까지 진행하면 $v_\ast$가 찾아짐
- Asynchronous dynamic programming : 모든 states에 대해서 진행하는게 아니라 일부 state에 대해서만 update를 진행하는 방법
  - In-place dynamic programming : old, new policy 구분 없이 in-place로 update 진행 $$v(s)\leftarrow \max_a\mathbb{E}[R_{t+1}+\gamma v(S_{t+1})\mid S_t=s,A_t=a]$$
  - prioritized sweeping : Bellman error를 계산해서 backup한 후에 큰 순으로 state selection 이뤄지도록 하는 방법 $$\text{error}=\lvert\max_a\mathbb{E}[R_{t+1}+\gamma v(S_{t+1})\mid S_t=s,A_t=a]-v(s)\rvert$$
  - real-time dynamic programming : 현재 agent와 관련이 있는 states에 대해서만 update 진행 e.g. current state 근처의 states
- backup 방법
  - full-width backups : BFS처럼 모든 states와 actions을 저장
  - sample backups : sample한 대로 $<s,a,r,s^\prime>$을 저장

# Theoretical Fundamentals of Dynamic Programming

- Normed vector spaces : vector space $\mathcal{X}$ + norm $\lVert.\rVert$ on the elements of $\mathcal{X}$
- norms : 0보다 크거나 같아야되고 norm이 0이면 x도 영벡터. 삼각부등식 성립. homogeneity 성립($\lVert ax\rVert=\lvert a\rvert \lVert x\rVert$.
- $\alpha$-contraction mapping $\mathcal{T}$ : $\exists \alpha\in[0,1)\ s.t.\ \lVert \mathcal{T}x_1-\mathcal{T}x_2\rVert\le \alpha\lVert x_1-x_2\rVert$
  - 만약 $\alpha\in[0,1]$ 이면 non-expanding mapping이라고 함
  - 수열 $x_n$이 $x$로 수렴하면 $\mathcal{T}x_n$도 $\mathcal{T} x$로 수렴함
- a vector x is a fixed point of an operator $\mathcal{T}$ : $x=\mathcal{T}x$
- Banach fixed point theorem : complete normed vector space와 $\gamma$-contraction mapping $\mathcal{T}$에 대해서 $\mathcal{T}$는 unique fixed point x를 가지고 $x_{n+1}=\mathcal{T}x_{n}$가 x로 수렴함
- Bellman optimality operator $T_\mathcal{V}^\ast$ : 어떤 value function $f$에 대해서 적용하면 현재 상태에서 가장 최적의 행동을 했을 때 얻을 수 있는 기대 보상의 합을 반환함 $$(T_\mathcal{V}^\ast f)(s)=\max_a [r(s,a)+\gamma \sum_{s^\prime}p(s^\prime\mid a,s)f(s^\prime)], \forall f\in \mathcal{V} $$
  - $T^\ast$는 unique fixed point를 갖고 $\gamma$-contraction mapping이며 monotonic 함 ($u\le v\Rightarrow T^\ast u\le T^\ast v$)

# Title

-

# Title

-

# Title

-

# Title

-
